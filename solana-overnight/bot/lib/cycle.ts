import { supportsKvCas, type HostKvApi, type JsonValue } from "@cursor/bdk";
import {
  runDeskCycle,
  type Book,
  type CycleResult,
  type Mark,
  type Snapshot,
  type TxnWindow,
} from "./engine.js";

const WSOL = "So11111111111111111111111111111111111111112";
const MAX_REVIEW = 6;
const MAX_INFO_ATTEMPTS = 8;
const YOUNG_POOL_MS = 15 * 60 * 1000;
const FRESH_POOL_MS = 36 * 60 * 60 * 1000;
const INFO_WAIT_MS = 2 * 60 * 60 * 1000;
const USER_AGENT = "solana-overnight-desk/0.1";

type RawPool = {
  mint: string;
  symbol: string;
  name: string;
  dexId: string;
  poolAddress: string;
  poolCreatedAt: string | null;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volumeH1Usd: number | null;
  txnsH1: TxnWindow | null;
  priceChangeH1Pct: number | null;
  priceChangeM5Pct: number | null;
};

type DexPair = {
  priceUsd: number | null;
  liquidityUsd: number | null;
  volumeH1Usd: number | null;
  txnsH1: TxnWindow | null;
  priceChangeH1Pct: number | null;
  priceChangeM5Pct: number | null;
  dexId: string;
  pairAddress: string;
  symbol: string;
  name: string;
};

export async function runCycle(
  kv: HostKvApi,
  input: { phase?: "scan" | "report"; force?: boolean },
  now = new Date(),
): Promise<CycleResult & { infoDeferred: number }> {
  const phase = input.phase ?? "scan";
  const force = input.force === true;
  const probe = runDeskCycle({
    now,
    phase,
    force,
    book: null,
    candidates: [],
    marks: {},
    universeError: null,
  });
  if (probe.result.skipped || !probe.result.nightId) {
    return { ...probe.result, infoDeferred: 0 };
  }

  const stored = await readBook(kv, bookKey(probe.result.nightId));
  const universe = await loadUniverse();
  const openMints = stored?.open.map((position) => position.mint) ?? [];
  const reviewed = new Set([
    ...(stored?.rejects.map((reject) => reject.mint) ?? []),
    ...(stored?.open.map((position) => position.mint) ?? []),
    ...(stored?.closed.map((trade) => trade.mint) ?? []),
  ]);
  const queue = reviewOrder(
    universe.pools.filter((pool) => !reviewed.has(pool.mint)),
    now.getTime(),
  );
  const chosen: RawPool[] = [];
  const infoByMint = new Map<string, TokenInfo | null>();
  let infoDeferred = 0;
  let attempts = 0;
  for (const pool of queue) {
    if (chosen.length >= MAX_REVIEW || attempts >= MAX_INFO_ATTEMPTS) break;
    attempts += 1;
    const loaded = await loadTokenInfo(pool.mint);
    await sleep(1000);
    const age = poolAgeMs(pool, now.getTime());
    const tooNew = age != null && age < INFO_WAIT_MS;
    if (loaded.status === "unavailable" || (loaded.status === "missing" && tooNew)) {
      infoDeferred += 1;
      continue;
    }
    chosen.push(pool);
    infoByMint.set(pool.mint, loaded.status === "ok" ? loaded.info : null);
  }

  const dex = await loadDexPairs([...chosen.map((pool) => pool.mint), ...openMints]);
  const snapshots: Snapshot[] = chosen.map((pool) =>
    buildSnapshot(pool, dex.get(pool.mint) ?? null, infoByMint.get(pool.mint) ?? null),
  );

  const marks: Record<string, Mark> = {};
  for (const mint of openMints) {
    const pair = dex.get(mint);
    const pool = universe.pools.find((item) => item.mint === mint);
    if (!pair && !pool) continue;
    marks[mint] = {
      gtPriceUsd: pool?.priceUsd ?? null,
      dexPriceUsd: pair?.priceUsd ?? null,
      gtLiquidityUsd: pool?.liquidityUsd ?? null,
      dexLiquidityUsd: pair?.liquidityUsd ?? null,
      priceChangeM5Pct: pair?.priceChangeM5Pct ?? pool?.priceChangeM5Pct ?? null,
      priceChangeH1Pct: pair?.priceChangeH1Pct ?? pool?.priceChangeH1Pct ?? null,
      txnsH1: pair?.txnsH1 ?? pool?.txnsH1 ?? null,
    };
  }

  let book = stored;
  let outcome = runDeskCycle({
    now,
    phase,
    force,
    book,
    candidates: snapshots,
    marks,
    universeError: universe.error,
  });
  let saved = false;
  for (let attempt = 0; attempt < 3 && outcome.book; attempt += 1) {
    saved = await writeBook(kv, bookKey(outcome.book.nightId), outcome.book);
    if (saved) break;
    book = await readBook(kv, bookKey(outcome.book.nightId));
    outcome = runDeskCycle({
      now,
      phase,
      force,
      book,
      candidates: snapshots,
      marks,
      universeError: universe.error,
    });
  }
  if (outcome.book && !saved) {
    await kv.put(
      bookKey(outcome.book.nightId),
      JSON.parse(JSON.stringify(outcome.book)) as JsonValue,
    );
  }
  if (outcome.book && !outcome.book.rehearsal) {
    await kv.put("desk:live-night", outcome.book.nightId);
  }
  if (outcome.book?.rehearsal) {
    await kv.put("desk:rehearsal-night", outcome.book.nightId);
  }
  return { ...outcome.result, infoDeferred };
}

export async function readDesk(
  kv: HostKvApi,
  scope: "live" | "rehearsal",
): Promise<{ book: Book | null; nightId: string | null }> {
  const pointer = scope === "rehearsal" ? "desk:rehearsal-night" : "desk:live-night";
  const nightId = await kv.get(pointer);
  if (typeof nightId !== "string" || !nightId) return { book: null, nightId: null };
  return { book: await readBook(kv, bookKey(nightId)), nightId };
}

function poolAgeMs(pool: RawPool, nowMs: number): number | null {
  if (!pool.poolCreatedAt) return null;
  const created = Date.parse(pool.poolCreatedAt);
  if (!Number.isFinite(created)) return null;
  return nowMs - created;
}

function reviewOrder(pools: RawPool[], nowMs: number): RawPool[] {
  const young: RawPool[] = [];
  const fresh: RawPool[] = [];
  const older: RawPool[] = [];
  for (const pool of pools) {
    const age = poolAgeMs(pool, nowMs);
    if (age != null && age < YOUNG_POOL_MS) young.push(pool);
    else if (age != null && age < FRESH_POOL_MS) fresh.push(pool);
    else older.push(pool);
  }
  const byLiquidity = (a: RawPool, b: RawPool) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0);
  fresh.sort(byLiquidity);
  older.sort(byLiquidity);
  return [...fresh, ...older, ...young.slice(0, 2)];
}

function bookKey(nightId: string): string {
  return `desk:book:${nightId}`;
}

async function readBook(kv: HostKvApi, key: string): Promise<Book | null> {
  const value = await kv.get(key);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Book;
}

async function writeBook(kv: HostKvApi, key: string, book: Book): Promise<boolean> {
  const value = JSON.parse(JSON.stringify(book)) as JsonValue;
  if (!supportsKvCas(kv)) {
    await kv.put(key, value);
    return true;
  }
  const current = await kv.getWithVersion(key);
  const result = current
    ? await kv.putIfVersion(key, value, current.version)
    : await kv.putIfAbsent(key, value);
  return result.ok;
}

async function loadUniverse(): Promise<{ pools: RawPool[]; error: string | null }> {
  const pools: RawPool[] = [];
  const seen = new Set<string>();
  let error: string | null = null;
  const urls = [
    "https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1&include=dex,base_token,quote_token",
    "https://api.geckoterminal.com/api/v2/networks/solana/dexes/pumpswap/pools?page=1&include=dex,base_token,quote_token",
  ];
  for (const url of urls) {
    try {
      const payload = await getJson(url);
      for (const pool of parsePools(payload)) {
        if (seen.has(pool.mint)) continue;
        seen.add(pool.mint);
        pools.push(pool);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "universe_fetch_failed";
    }
    await sleep(800);
  }
  if (pools.length === 0 && !error) error = "no_migrated_pools";
  return { pools, error: pools.length === 0 ? error : null };
}

function parsePools(payload: unknown): RawPool[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as { data?: unknown; included?: unknown };
  const included = new Map<string, Record<string, unknown>>();
  if (Array.isArray(record.included)) {
    for (const item of record.included) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.id === "string") included.set(row.id, row);
    }
  }
  if (!Array.isArray(record.data)) return [];
  const pools: RawPool[] = [];
  for (const item of record.data) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const attributes = asRecord(row.attributes);
    const relationships = asRecord(row.relationships);
    const dexId = relationshipId(relationships, "dex");
    const baseId = relationshipId(relationships, "base_token");
    const quoteId = relationshipId(relationships, "quote_token");
    const base = baseId ? included.get(baseId) : undefined;
    const baseAttrs = asRecord(base?.attributes);
    const mint = stringOf(baseAttrs?.address);
    const quoteMint = quoteId?.startsWith("solana_") ? quoteId.slice("solana_".length) : "";
    if (!mint || !attributes) continue;
    if (quoteMint && quoteMint !== WSOL) continue;
    const pumpPool =
      mint.endsWith("pump") &&
      (dexId === "pumpswap" || dexId === "raydium");
    if (!pumpPool || !dexId) continue;
    const tx = asRecord(asRecord(attributes.transactions)?.h1);
    pools.push({
      mint,
      symbol: stringOf(baseAttrs?.symbol) || "UNKNOWN",
      name: stringOf(baseAttrs?.name) || stringOf(attributes.name) || "Unknown",
      dexId,
      poolAddress: stringOf(attributes.address) || "",
      poolCreatedAt: stringOf(attributes.pool_created_at),
      priceUsd: numberOf(attributes.base_token_price_usd),
      liquidityUsd: numberOf(attributes.reserve_in_usd),
      volumeH1Usd: numberOf(asRecord(attributes.volume_usd)?.h1),
      txnsH1: tx
        ? {
            buys: numberOf(tx.buys) ?? 0,
            sells: numberOf(tx.sells) ?? 0,
            buyers: numberOf(tx.buyers),
            sellers: numberOf(tx.sellers),
          }
        : null,
      priceChangeH1Pct: numberOf(asRecord(attributes.price_change_percentage)?.h1),
      priceChangeM5Pct: numberOf(asRecord(attributes.price_change_percentage)?.m5),
    });
  }
  return pools;
}

type TokenInfo = {
  migrated: boolean | null;
  graduationPct: number | null;
  creatorWallet: string | null;
  creatorHoldingPct: number | null;
  holderCount: number | null;
  top10Pct: number | null;
  mintAuthorityRevoked: boolean | null;
  freezeAuthorityRevoked: boolean | null;
  honeypot: "yes" | "no" | "unknown" | null;
  nsfw: boolean | null;
  twitter: boolean;
  telegram: boolean;
  website: boolean;
  descriptionChars: number;
  pumpListed: boolean;
};

async function fetchInfo(mint: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const url = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}/info`;
  const first = await fetchOnce(url);
  if (first.status !== 429) return first;
  await sleep(2500);
  return fetchOnce(url);
}

async function loadTokenInfo(
  mint: string,
): Promise<{ status: "ok"; info: TokenInfo } | { status: "missing" } | { status: "unavailable" }> {
  try {
    const response = await fetchInfo(mint);
    if (response.status === 404) return { status: "missing" };
    if (!response.ok || !response.json) return { status: "unavailable" };
    const data = asRecord(asRecord(response.json)?.data);
    const attributes = asRecord(data?.attributes);
    if (!attributes) return { status: "unavailable" };
    const holders = asRecord(attributes.holders);
    const distribution = asRecord(holders?.distribution_percentage);
    const launchpad = asRecord(attributes.launchpad_details);
    const categories = [
      ...(Array.isArray(attributes.categories) ? attributes.categories : []),
      ...(Array.isArray(attributes.gt_category_ids) ? attributes.gt_category_ids : []),
    ]
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.toLowerCase());
    return {
      status: "ok",
      info: {
        migrated: typeof launchpad?.completed === "boolean" ? launchpad.completed : null,
        graduationPct: numberOf(launchpad?.graduation_percentage),
        creatorWallet: stringOf(attributes.developer_address),
        creatorHoldingPct: numberOf(attributes.developer_holding_percentage),
        holderCount: numberOf(holders?.count),
        top10Pct: numberOf(distribution?.top_10),
        mintAuthorityRevoked: authorityRevoked(attributes.mint_authority),
        freezeAuthorityRevoked: authorityRevoked(attributes.freeze_authority),
        honeypot: honeypotOf(attributes.is_honeypot),
        nsfw: typeof attributes.is_nsfw === "boolean" ? attributes.is_nsfw : null,
        twitter: Boolean(stringOf(attributes.twitter_handle)),
        telegram: Boolean(stringOf(attributes.telegram_handle)),
        website: Array.isArray(attributes.websites) && attributes.websites.length > 0,
        descriptionChars: stringOf(attributes.description)?.length ?? 0,
        pumpListed: categories.some((item) => item.includes("pump")),
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}

async function loadDexPairs(mints: string[]): Promise<Map<string, DexPair>> {
  const unique = [...new Set(mints.filter(Boolean))];
  const out = new Map<string, DexPair>();
  if (unique.length === 0) return out;
  try {
    const payload = await getJson(
      `https://api.dexscreener.com/tokens/v1/solana/${unique.map(encodeURIComponent).join(",")}`,
    );
    if (!Array.isArray(payload)) return out;
    for (const item of payload) {
      const row = asRecord(item);
      if (!row) continue;
      const base = asRecord(row.baseToken);
      const mint = stringOf(base?.address);
      if (!mint) continue;
      const dexId = stringOf(row.dexId) || "";
      if (dexId !== "pumpswap" && dexId !== "raydium") continue;
      const liquidity = numberOf(asRecord(row.liquidity)?.usd);
      const current = out.get(mint);
      if (current && (current.liquidityUsd ?? 0) >= (liquidity ?? 0)) continue;
      const h1 = asRecord(asRecord(row.txns)?.h1);
      out.set(mint, {
        priceUsd: numberOf(row.priceUsd),
        liquidityUsd: liquidity,
        volumeH1Usd: numberOf(asRecord(row.volume)?.h1),
        txnsH1: h1
          ? {
              buys: numberOf(h1.buys) ?? 0,
              sells: numberOf(h1.sells) ?? 0,
              buyers: null,
              sellers: null,
            }
          : null,
        priceChangeH1Pct: numberOf(asRecord(row.priceChange)?.h1),
        priceChangeM5Pct: numberOf(asRecord(row.priceChange)?.m5),
        dexId,
        pairAddress: stringOf(row.pairAddress) || "",
        symbol: stringOf(base?.symbol) || "UNKNOWN",
        name: stringOf(base?.name) || "Unknown",
      });
    }
  } catch {
    return out;
  }
  return out;
}

function buildSnapshot(pool: RawPool, dex: DexPair | null, info: TokenInfo | null): Snapshot {
  const tx = pool.txnsH1 ?? dex?.txnsH1 ?? null;
  const buyers = pool.txnsH1?.buyers ?? dex?.txnsH1?.buyers ?? null;
  const sellers = pool.txnsH1?.sellers ?? dex?.txnsH1?.sellers ?? null;
  return {
    mint: pool.mint,
    symbol: pool.symbol || dex?.symbol || "UNKNOWN",
    name: pool.name || dex?.name || "Unknown",
    dexId: pool.dexId || dex?.dexId || "",
    poolAddress: pool.poolAddress || dex?.pairAddress || "",
    poolCreatedAt: pool.poolCreatedAt,
    gtPriceUsd: pool.priceUsd,
    dexPriceUsd: dex?.priceUsd ?? null,
    gtLiquidityUsd: pool.liquidityUsd,
    dexLiquidityUsd: dex?.liquidityUsd ?? null,
    volumeH1Usd: pool.volumeH1Usd ?? dex?.volumeH1Usd ?? null,
    txnsH1: tx ? { ...tx, buyers, sellers } : null,
    priceChangeH1Pct: pool.priceChangeH1Pct ?? dex?.priceChangeH1Pct ?? null,
    priceChangeM5Pct: pool.priceChangeM5Pct ?? dex?.priceChangeM5Pct ?? null,
    migrated: info?.migrated ?? null,
    graduationPct: info?.graduationPct ?? null,
    creatorWallet: info?.creatorWallet ?? null,
    creatorHoldingPct: info?.creatorHoldingPct ?? null,
    holderCount: info?.holderCount ?? null,
    top10Pct: info?.top10Pct ?? null,
    mintAuthorityRevoked: info?.mintAuthorityRevoked ?? null,
    freezeAuthorityRevoked: info?.freezeAuthorityRevoked ?? null,
    honeypot: info?.honeypot ?? null,
    nsfw: info?.nsfw ?? null,
    twitter: info?.twitter ?? false,
    telegram: info?.telegram ?? false,
    website: info?.website ?? false,
    descriptionChars: info?.descriptionChars ?? 0,
    pumpListed: info?.pumpListed ?? pool.mint.endsWith("pump"),
  };
}

function authorityRevoked(value: unknown): boolean | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value === false;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "no" || normalized === "none" || normalized === "null") return true;
  if (normalized === "yes" || normalized.length > 0) return false;
  return null;
}

function honeypotOf(value: unknown): "yes" | "no" | "unknown" | null {
  if (value == null) return null;
  if (value === true) return "yes";
  if (value === false) return "no";
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "true") return "yes";
  if (normalized === "no" || normalized === "false") return "no";
  if (normalized === "unknown") return "unknown";
  return null;
}

async function getJson(url: string): Promise<unknown> {
  const payload = await fetchOnce(url);
  if (payload.status !== 429) {
    if (!payload.ok) throw new Error(`${payload.status} ${url}`);
    return payload.json;
  }
  await sleep(2000);
  const retry = await fetchOnce(url);
  if (!retry.ok) throw new Error(`${retry.status} ${url}`);
  return retry.json;
}

async function fetchOnce(url: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return { ok: false, status: response.status, json: null };
  return { ok: true, status: response.status, json: await response.json() };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function relationshipId(relationships: Record<string, unknown> | null, name: string): string | null {
  const rel = asRecord(relationships?.[name]);
  const data = asRecord(rel?.data);
  return stringOf(data?.id);
}

function stringOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
