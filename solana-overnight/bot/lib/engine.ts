/**
 * Paper-trading rules for migrated Pump.fun tokens.
 * Pure: no network, no clock reads except the Date passed in.
 */

export const PAPER_NOTIONAL_USD = 100;
export const DEX_FEE_BPS = 25;
export const NETWORK_FEE_USD = 0.03;
export const MAX_OPEN = 5;
export const MAX_NEW_ENTRIES = 3;
export const MIN_LIQUIDITY_USD = 12_000;
export const MAX_SLIPPAGE_BPS = 200;
export const MIN_SLIPPAGE_BPS = 15;
export const MAX_TOP10_PCT = 55;
export const MIN_HOLDERS = 80;
export const MAX_CREATOR_HOLDING_PCT = 6;
export const MAX_VOLUME_TO_LIQUIDITY = 25;
export const MIN_BUY_SELL_RATIO = 1.1;
export const MAX_ONE_SIDED_RATIO = 4;
export const MAX_H1_EXTENSION_PCT = 80;
export const FALLING_KNIFE_M5_PCT = -8;
export const STOP_LOSS_RETURN = -0.12;
export const TAKE_PROFIT_RETURN = 0.25;
export const PRICE_DIVERGENCE = 0.15;
export const LIQUIDITY_DIVERGENCE = 0.5;
export const FEE_MODEL = "fee-model-2026-10";

export const ASSUMPTIONS = {
  feeModel: FEE_MODEL,
  notionalUsd: PAPER_NOTIONAL_USD,
  dexFeeBpsPerSide: DEX_FEE_BPS,
  networkFeeUsdPerSide: NETWORK_FEE_USD,
  slippage:
    "max(15 bps, round(2 * notional / liquidity * 10000)); entry uses the higher mid, exit uses the lower mid",
  liveTrading: false,
} as const;

export const RISK_WARNINGS = [
  "Chat cannot connect a wallet or send a transaction. Rehearsals stay paper.",
  "Fee and slippage numbers are a model until an armed overnight swap fills.",
  "Indexer data can lag. When GeckoTerminal and DexScreener disagree beyond the gate, the token is rejected.",
  "Top-10 holder share includes AMM vaults, so a fresh migration with few holders is rejected as incomplete.",
  "Live USDC swaps run only on the overnight schedule when LIVE_TRADING=1 and SOLANA_SECRET_KEY are set. A chat request is not approval.",
] as const;

const REASON_LABELS: Record<string, string> = {
  not_migrated: "Bonding curve has not completed a migration onto a DEX",
  not_pump: "Token is not a Pump.fun mint",
  incomplete_market: "Price, liquidity, volume, or trade counts are missing",
  incomplete_holders: "Holder count or top-10 share is missing or too thin to judge",
  incomplete_creator: "Creator wallet or creator holding share is missing",
  inconsistent_price: "GeckoTerminal and DexScreener prices disagree",
  inconsistent_liquidity: "GeckoTerminal and DexScreener liquidity disagree",
  honeypot: "Indexer flags the token as a honeypot",
  nsfw: "Token is marked NSFW",
  mint_authority: "Mint authority is still enabled or was not confirmed revoked",
  freeze_authority: "Freeze authority is still enabled or was not confirmed revoked",
  thin_liquidity: "Liquidity is too thin for a honest paper fill",
  excessive_slippage: "Modeled slippage is above the cap",
  holder_concentration: "Top 10 holders own too much of the supply",
  creator_concentration: "Creator wallet still holds too much of the supply",
  wash_volume: "Volume is extreme versus liquidity or unique buyers",
  one_sided_flow: "Buys dwarf sells with very few sellers",
  low_unique_buyers: "Too few unique buyers for the print count",
  weak_buy_pressure: "Buy count does not lead sell count",
  extended_momentum: "The last hour is already extended",
  falling_knife: "The last five minutes are falling",
  no_social_momentum: "No website, Telegram, Twitter, or description",
  already_traded: "This mint was already paper-traded tonight",
  book_full: "The paper book is at its open-position cap",
};

export type ChicagoClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isoDate: string;
  label: string;
};

export type TxnWindow = {
  buys: number;
  sells: number;
  buyers: number | null;
  sellers: number | null;
};

export type Snapshot = {
  mint: string;
  symbol: string;
  name: string;
  dexId: string;
  poolAddress: string;
  poolCreatedAt: string | null;
  gtPriceUsd: number | null;
  dexPriceUsd: number | null;
  gtLiquidityUsd: number | null;
  dexLiquidityUsd: number | null;
  volumeH1Usd: number | null;
  txnsH1: TxnWindow | null;
  priceChangeH1Pct: number | null;
  priceChangeM5Pct: number | null;
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

export type Mark = {
  gtPriceUsd: number | null;
  dexPriceUsd: number | null;
  gtLiquidityUsd: number | null;
  dexLiquidityUsd: number | null;
  priceChangeM5Pct: number | null;
  priceChangeH1Pct: number | null;
  txnsH1: TxnWindow | null;
};

export type Assumptions = {
  feeModel: string;
  notionalUsd: number;
  dexFeeBpsPerSide: number;
  networkFeeUsdPerSide: number;
  slippage: string;
  liveTrading: boolean;
};

export type LiveFill = {
  signature: string;
  inputMint: string;
  outputMint: string;
  inputAmountRaw: string;
  outputAmountRaw: string;
};

export type PaperPosition = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  poolAddress: string;
  creatorWallet: string;
  openedAt: string;
  notionalUsd: number;
  midPriceUsd: number;
  fillPriceUsd: number;
  slippageBps: number;
  entryFeeUsd: number;
  tokens: number;
  liquidityUsd: number;
  gtPriceUsd: number | null;
  dexPriceUsd: number | null;
  score: number;
  warnings: string[];
  liveFill?: LiveFill | null;
  lastMark: {
    at: string;
    midPriceUsd: number;
    unrealizedPnlUsd: number;
    slippageBps: number;
  } | null;
};

export type ClosedTrade = PaperPosition & {
  closedAt: string;
  exitReason:
    | "stop_loss"
    | "take_profit"
    | "momentum_flip"
    | "morning_flatten"
    | "unpriced_flatten";
  exitMidPriceUsd: number | null;
  exitFillPriceUsd: number | null;
  exitSlippageBps: number | null;
  exitFeeUsd: number | null;
  exitLiquidityUsd: number | null;
  proceedsUsd: number | null;
  realizedPnlUsd: number | null;
  exitFill?: LiveFill | null;
};

export type RejectRecord = {
  at: string;
  mint: string;
  symbol: string;
  reasons: string[];
  labels: string[];
  liquidityUsd: number | null;
  creatorWallet: string | null;
};

export type DeskEvent = {
  at: string;
  kind: "entry" | "exit" | "reject" | "cycle";
  mint: string | null;
  detail: string;
};

export type Book = {
  nightId: string;
  rehearsal: boolean;
  cycles: number;
  updatedAt: string;
  open: PaperPosition[];
  closed: ClosedTrade[];
  rejects: RejectRecord[];
  events: DeskEvent[];
  assumptions: Assumptions;
};

export type PassAssessment = {
  decision: "pass";
  reasons: [];
  score: number;
  slippageBps: number;
  liquidityUsd: number;
  midPriceUsd: number;
  warnings: string[];
};

export type RejectAssessment = {
  decision: "reject";
  reasons: string[];
  labels: string[];
  liquidityUsd: number | null;
};

export type Assessment = PassAssessment | RejectAssessment;

export function chicagoClock(now: Date): ChicagoClock {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((part) => [part.type, part.value]),
  );
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const minute = Number(parts.minute);
  const isoDate = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  return {
    year,
    month,
    day,
    hour,
    minute,
    isoDate,
    label: `${isoDate} ${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")} America/Chicago`,
  };
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function deskNight(
  clock: ChicagoClock,
  phase: "scan" | "report",
  force: boolean,
): { id: string; rehearsal: boolean } | null {
  if (phase === "report") {
    if (clock.hour !== 6) return null;
    return { id: addCalendarDays(clock.isoDate, -1), rehearsal: false };
  }
  if (clock.hour >= 22) return { id: clock.isoDate, rehearsal: false };
  if (clock.hour < 6) return { id: addCalendarDays(clock.isoDate, -1), rehearsal: false };
  if (force) return { id: `rehearsal-${clock.isoDate}`, rehearsal: true };
  return null;
}

export function inScanWindow(clock: ChicagoClock): boolean {
  return clock.hour >= 22 || clock.hour < 6;
}

export function slippageBps(notionalUsd: number, liquidityUsd: number): number {
  if (!(liquidityUsd > 0)) return 10_000;
  const impact = Math.round((2 * notionalUsd * 10_000) / liquidityUsd);
  return Math.max(MIN_SLIPPAGE_BPS, impact);
}

export function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? code;
}

function finite(value: number | null): value is number {
  return value != null && Number.isFinite(value);
}

function conservativeMid(higherIsWorse: boolean, a: number | null, b: number | null): number | null {
  const prices = [a, b].filter(finite);
  if (prices.length === 0) return null;
  return higherIsWorse ? Math.max(...prices) : Math.min(...prices);
}

function relativeGap(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b));
  if (denom === 0) return 0;
  return Math.abs(a - b) / denom;
}

export function assessCandidate(snapshot: Snapshot): Assessment {
  const reasons: string[] = [];
  const pumpMint = snapshot.mint.endsWith("pump") || snapshot.pumpListed;
  const onPumpSwap = snapshot.dexId === "pumpswap";
  const onRaydiumPump = snapshot.dexId === "raydium" && snapshot.mint.endsWith("pump");
  if (!pumpMint || !(onPumpSwap || onRaydiumPump)) reasons.push("not_pump");
  // A PumpSwap pool is the migration. The launchpad flag is often still false
  // after the pool exists, so it confirms a migration but its absence does not
  // deny one. Raydium still needs the flag or a Pump.fun category.
  const launchpadCompleted = snapshot.migrated === true || snapshot.graduationPct === 100;
  const migrated =
    Boolean(snapshot.poolAddress) &&
    ((onPumpSwap && pumpMint) || (onRaydiumPump && (launchpadCompleted || snapshot.pumpListed)));
  if (!migrated) reasons.push("not_migrated");

  const prices = [snapshot.gtPriceUsd, snapshot.dexPriceUsd].filter(finite);
  const liquids = [snapshot.gtLiquidityUsd, snapshot.dexLiquidityUsd].filter(finite);
  if (
    prices.length < 2 ||
    liquids.length < 2 ||
    !finite(snapshot.volumeH1Usd) ||
    !snapshot.txnsH1 ||
    !finite(snapshot.priceChangeH1Pct) ||
    !finite(snapshot.priceChangeM5Pct)
  ) {
    reasons.push("incomplete_market");
  } else {
    if (relativeGap(prices[0], prices[1]) > PRICE_DIVERGENCE) reasons.push("inconsistent_price");
    if (relativeGap(liquids[0], liquids[1]) > LIQUIDITY_DIVERGENCE) {
      reasons.push("inconsistent_liquidity");
    }
  }

  if (snapshot.holderCount == null || snapshot.top10Pct == null) {
    reasons.push("incomplete_holders");
  } else if (snapshot.holderCount < MIN_HOLDERS) {
    reasons.push("incomplete_holders");
  } else if (snapshot.top10Pct > MAX_TOP10_PCT) {
    reasons.push("holder_concentration");
  }

  if (!snapshot.creatorWallet || snapshot.creatorHoldingPct == null) {
    reasons.push("incomplete_creator");
  } else if (snapshot.creatorHoldingPct > MAX_CREATOR_HOLDING_PCT) {
    reasons.push("creator_concentration");
  }

  if (snapshot.mintAuthorityRevoked !== true) reasons.push("mint_authority");
  if (snapshot.freezeAuthorityRevoked !== true) reasons.push("freeze_authority");
  if (snapshot.honeypot === "yes") reasons.push("honeypot");
  if (snapshot.nsfw === true) reasons.push("nsfw");

  const liquidityUsd = liquids.length >= 2 ? Math.min(...liquids) : liquids[0] ?? null;
  if (liquidityUsd == null || liquidityUsd < MIN_LIQUIDITY_USD) reasons.push("thin_liquidity");

  const slip =
    liquidityUsd == null ? 10_000 : slippageBps(PAPER_NOTIONAL_USD, liquidityUsd);
  if (slip > MAX_SLIPPAGE_BPS) reasons.push("excessive_slippage");

  const tx = snapshot.txnsH1;
  if (tx && tx.sells > 0 && tx.buys / tx.sells < MIN_BUY_SELL_RATIO) {
    reasons.push("weak_buy_pressure");
  }
  if (
    tx &&
    tx.sells > 0 &&
    tx.buys / tx.sells > MAX_ONE_SIDED_RATIO &&
    (tx.sellers == null || tx.sellers < 10)
  ) {
    reasons.push("one_sided_flow");
  }
  if (tx && (tx.buyers == null || tx.buyers < 20)) reasons.push("low_unique_buyers");
  if (
    tx &&
    finite(snapshot.volumeH1Usd) &&
    liquidityUsd != null &&
    liquidityUsd > 0 &&
    (snapshot.volumeH1Usd / liquidityUsd > 40 ||
      (snapshot.volumeH1Usd / liquidityUsd > MAX_VOLUME_TO_LIQUIDITY &&
        tx.buyers != null &&
        tx.buyers < tx.buys * 0.25))
  ) {
    reasons.push("wash_volume");
  }

  if (finite(snapshot.priceChangeH1Pct) && snapshot.priceChangeH1Pct > MAX_H1_EXTENSION_PCT) {
    reasons.push("extended_momentum");
  }
  if (finite(snapshot.priceChangeM5Pct) && snapshot.priceChangeM5Pct <= FALLING_KNIFE_M5_PCT) {
    reasons.push("falling_knife");
  }

  const social =
    (snapshot.twitter ? 2 : 0) +
    (snapshot.telegram ? 1 : 0) +
    (snapshot.website ? 1 : 0) +
    (snapshot.descriptionChars >= 80 ? 1 : 0);
  if (social === 0) reasons.push("no_social_momentum");

  const unique = [...new Set(reasons)];
  if (unique.length > 0 || liquidityUsd == null || prices.length < 2) {
    return {
      decision: "reject",
      reasons: unique.length > 0 ? unique : ["incomplete_market"],
      labels: (unique.length > 0 ? unique : ["incomplete_market"]).map(reasonLabel),
      liquidityUsd,
    };
  }

  const ratio = tx && tx.sells > 0 ? tx.buys / tx.sells : 1;
  const score =
    Math.min(ratio, 2) * 20 +
    Math.max(0, Math.min(snapshot.priceChangeH1Pct ?? 0, 40)) +
    social * 8 +
    Math.max(0, MAX_TOP10_PCT - (snapshot.top10Pct ?? MAX_TOP10_PCT)) * 0.4 +
    Math.min(liquidityUsd / 1000, 40) * 0.3 +
    Math.min((snapshot.holderCount ?? 0) / 10, 20);

  const warnings: string[] = [];
  if (snapshot.honeypot === "unknown" || snapshot.honeypot == null) {
    warnings.push("Honeypot check is unknown, not a pass.");
  }
  if (snapshot.nsfw == null) warnings.push("NSFW flag was missing.");
  return {
    decision: "pass",
    reasons: [],
    score: Math.round(score * 10) / 10,
    slippageBps: slip,
    liquidityUsd,
    midPriceUsd: Math.max(...prices),
    warnings,
  };
}

export function entryFeeUsd(notionalUsd: number): number {
  return (notionalUsd * DEX_FEE_BPS) / 10_000 + NETWORK_FEE_USD;
}

export function simulateEntry(midPriceUsd: number, slippage: number, notionalUsd = PAPER_NOTIONAL_USD) {
  const fillPriceUsd = midPriceUsd * (1 + slippage / 10_000);
  const fee = entryFeeUsd(notionalUsd);
  const tokens = (notionalUsd - fee) / fillPriceUsd;
  return {
    fillPriceUsd,
    entryFeeUsd: fee,
    tokens,
  };
}

export function simulateExit(tokens: number, midPriceUsd: number, slippage: number) {
  const fillPriceUsd = midPriceUsd * (1 - slippage / 10_000);
  const gross = tokens * fillPriceUsd;
  const exitFeeUsd = (gross * DEX_FEE_BPS) / 10_000 + NETWORK_FEE_USD;
  const proceedsUsd = gross - exitFeeUsd;
  return { fillPriceUsd, exitFeeUsd, proceedsUsd };
}

function emptyBook(nightId: string, rehearsal: boolean, nowIso: string): Book {
  return {
    nightId,
    rehearsal,
    cycles: 0,
    updatedAt: nowIso,
    open: [],
    closed: [],
    rejects: [],
    events: [],
    assumptions: { ...ASSUMPTIONS },
  };
}

function pushEvent(book: Book, event: DeskEvent) {
  book.events.push(event);
  if (book.events.length > 300) book.events.splice(0, book.events.length - 300);
}

function markFromSnapshot(snapshot: Snapshot): Mark {
  return {
    gtPriceUsd: snapshot.gtPriceUsd,
    dexPriceUsd: snapshot.dexPriceUsd,
    gtLiquidityUsd: snapshot.gtLiquidityUsd,
    dexLiquidityUsd: snapshot.dexLiquidityUsd,
    priceChangeM5Pct: snapshot.priceChangeM5Pct,
    priceChangeH1Pct: snapshot.priceChangeH1Pct,
    txnsH1: snapshot.txnsH1,
  };
}

function pricePair(mark: Mark): { mid: number | null; liquidity: number | null; sources: number } {
  const prices = [mark.gtPriceUsd, mark.dexPriceUsd].filter(finite);
  const liquids = [mark.gtLiquidityUsd, mark.dexLiquidityUsd].filter(finite);
  if (prices.length === 0) return { mid: null, liquidity: null, sources: 0 };
  return {
    mid: Math.min(...prices),
    liquidity: liquids.length ? Math.min(...liquids) : null,
    sources: prices.length,
  };
}

export type CycleResult = {
  ok: true;
  skipped: boolean;
  reason: string | null;
  paperTrading: boolean;
  liveTrading: boolean;
  chicago: string;
  nightId: string | null;
  rehearsal: boolean;
  phase: "scan" | "report";
  entered: PaperPosition[];
  exited: ClosedTrade[];
  cycleRejects: RejectRecord[];
  opportunities: { mint: string; symbol: string; score: number; entered: boolean }[];
  openCount: number;
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  unpricedCloses: number;
  rejectCounts: Record<string, number>;
  assumptions: Assumptions;
  riskWarnings: string[];
  universeError: string | null;
};

export function summarizePnl(book: Book): {
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  unpricedCloses: number;
  pricedCloses: number;
} {
  const priced = book.closed.filter((trade) => trade.realizedPnlUsd != null);
  const unrealized = book.open
    .map((position) => position.lastMark?.unrealizedPnlUsd)
    .filter((value): value is number => value != null);
  return {
    realizedPnlUsd:
      priced.length === 0
        ? null
        : Math.round(priced.reduce((sum, trade) => sum + (trade.realizedPnlUsd ?? 0), 0) * 100) /
          100,
    unrealizedPnlUsd:
      unrealized.length === 0
        ? null
        : Math.round(unrealized.reduce((sum, value) => sum + value, 0) * 100) / 100,
    unpricedCloses: book.closed.filter((trade) => trade.realizedPnlUsd == null).length,
    pricedCloses: priced.length,
  };
}

export function rejectCounts(book: Book): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const reject of book.rejects) {
    for (const reason of reject.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}

export function runDeskCycle(args: {
  now: Date;
  phase: "scan" | "report";
  force: boolean;
  book: Book | null;
  candidates: Snapshot[];
  marks: Record<string, Mark>;
  universeError: string | null;
}): { book: Book | null; result: CycleResult } {
  const clock = chicagoClock(args.now);
  const night = deskNight(clock, args.phase, args.force);
  const base = {
    paperTrading: true as const,
    liveTrading: false as const,
    chicago: clock.label,
    phase: args.phase,
    assumptions: { ...ASSUMPTIONS },
    riskWarnings: [...RISK_WARNINGS],
    universeError: args.universeError,
  };

  if (!night) {
    return {
      book: args.book,
      result: {
        ...base,
        ok: true,
        skipped: true,
        reason: args.phase === "report" ? "not_morning_close" : "outside_window",
        nightId: null,
        rehearsal: false,
        entered: [],
        exited: [],
        cycleRejects: [],
        opportunities: [],
        openCount: args.book?.open.length ?? 0,
        realizedPnlUsd: args.book ? summarizePnl(args.book).realizedPnlUsd : null,
        unrealizedPnlUsd: args.book ? summarizePnl(args.book).unrealizedPnlUsd : null,
        unpricedCloses: args.book ? summarizePnl(args.book).unpricedCloses : 0,
        rejectCounts: args.book ? rejectCounts(args.book) : {},
      },
    };
  }

  const nowIso = args.now.toISOString();
  const book =
    args.book && args.book.nightId === night.id
      ? args.book
      : emptyBook(night.id, night.rehearsal, nowIso);
  book.cycles += 1;
  book.updatedAt = nowIso;
  book.rehearsal = night.rehearsal;

  const entered: PaperPosition[] = [];
  const exited: ClosedTrade[] = [];
  const cycleRejects: RejectRecord[] = [];
  const opportunities: CycleResult["opportunities"] = [];
  const flatten = args.phase === "report";

  const markFor = (mint: string): Mark | null => {
    const snap = args.candidates.find((candidate) => candidate.mint === mint);
    if (snap) return markFromSnapshot(snap);
    return args.marks[mint] ?? null;
  };

  for (const position of [...book.open]) {
    if (position.openedAt === nowIso) continue;
    const mark = markFor(position.mint);
    const priced = mark ? pricePair(mark) : { mid: null, liquidity: null, sources: 0 };
    if (priced.mid == null || priced.liquidity == null) {
      if (!flatten) continue;
      const closed: ClosedTrade = {
        ...position,
        closedAt: nowIso,
        exitReason: "unpriced_flatten",
        exitMidPriceUsd: null,
        exitFillPriceUsd: null,
        exitSlippageBps: null,
        exitFeeUsd: null,
        exitLiquidityUsd: null,
        proceedsUsd: null,
        realizedPnlUsd: null,
      };
      book.open = book.open.filter((item) => item.id !== position.id);
      book.closed.push(closed);
      exited.push(closed);
      pushEvent(book, {
        at: nowIso,
        kind: "exit",
        mint: position.mint,
        detail: `${position.symbol} flattened without a price; P&L left blank`,
      });
      continue;
    }

    const slip = slippageBps(position.notionalUsd, priced.liquidity);
    const exit = simulateExit(position.tokens, priced.mid, slip);
    const realized = exit.proceedsUsd - position.notionalUsd;
    const ret = realized / position.notionalUsd;
    position.lastMark = {
      at: nowIso,
      midPriceUsd: priced.mid,
      unrealizedPnlUsd: Math.round(realized * 100) / 100,
      slippageBps: slip,
    };

    let exitReason: ClosedTrade["exitReason"] | null = null;
    if (ret <= STOP_LOSS_RETURN) exitReason = "stop_loss";
    else if (ret >= TAKE_PROFIT_RETURN) exitReason = "take_profit";
    else if (mark && momentumFlip(mark)) exitReason = "momentum_flip";
    else if (flatten) exitReason = "morning_flatten";

    if (!exitReason) continue;
    const closed: ClosedTrade = {
      ...position,
      closedAt: nowIso,
      exitReason,
      exitMidPriceUsd: priced.mid,
      exitFillPriceUsd: exit.fillPriceUsd,
      exitSlippageBps: slip,
      exitFeeUsd: exit.exitFeeUsd,
      exitLiquidityUsd: priced.liquidity,
      proceedsUsd: exit.proceedsUsd,
      realizedPnlUsd: Math.round(realized * 100) / 100,
    };
    book.open = book.open.filter((item) => item.id !== position.id);
    book.closed.push(closed);
    exited.push(closed);
    pushEvent(book, {
      at: nowIso,
      kind: "exit",
      mint: position.mint,
      detail: `${position.symbol} ${exitReason} net ${closed.realizedPnlUsd}`,
    });
  }

  if (!flatten && !args.universeError) {
    const candidates = dedupeSnapshots(args.candidates);
    const traded = new Set([
      ...book.open.map((position) => position.mint),
      ...book.closed.map((trade) => trade.mint),
    ]);
    const rejected = new Set(book.rejects.map((reject) => reject.mint));
    const ranked = candidates
      .map((snapshot) => ({ snapshot, assessment: assessCandidate(snapshot) }))
      .filter((item) => item.assessment.decision === "pass")
      .sort((a, b) => {
        const left = a.assessment.decision === "pass" ? a.assessment.score : 0;
        const right = b.assessment.decision === "pass" ? b.assessment.score : 0;
        return right - left;
      });

    const seenRejects = new Set<string>();
    for (const item of candidates) {
      if (traded.has(item.mint) || rejected.has(item.mint) || seenRejects.has(item.mint)) {
        continue;
      }
      seenRejects.add(item.mint);
      const assessment = assessCandidate(item);
      if (assessment.decision === "pass") continue;
      const record: RejectRecord = {
        at: nowIso,
        mint: item.mint,
        symbol: item.symbol,
        reasons: assessment.reasons,
        labels: assessment.labels,
        liquidityUsd: assessment.liquidityUsd,
        creatorWallet: item.creatorWallet,
      };
      book.rejects.push(record);
      cycleRejects.push(record);
      pushEvent(book, {
        at: nowIso,
        kind: "reject",
        mint: item.mint,
        detail: `${item.symbol}: ${assessment.reasons.join(",")}`,
      });
    }

    let slots = MAX_NEW_ENTRIES;
    for (const item of ranked) {
      if (item.assessment.decision !== "pass") continue;
      const snapshot = item.snapshot;
      if (traded.has(snapshot.mint)) {
        opportunities.push({
          mint: snapshot.mint,
          symbol: snapshot.symbol,
          score: item.assessment.score,
          entered: false,
        });
        continue;
      }
      if (book.open.length >= MAX_OPEN || slots <= 0) {
        opportunities.push({
          mint: snapshot.mint,
          symbol: snapshot.symbol,
          score: item.assessment.score,
          entered: false,
        });
        continue;
      }
      const fill = simulateEntry(
        item.assessment.midPriceUsd,
        item.assessment.slippageBps,
      );
      const position: PaperPosition = {
        id: `${night.id}:${snapshot.mint}`,
        mint: snapshot.mint,
        symbol: snapshot.symbol,
        name: snapshot.name,
        poolAddress: snapshot.poolAddress,
        creatorWallet: snapshot.creatorWallet ?? "",
        openedAt: nowIso,
        notionalUsd: PAPER_NOTIONAL_USD,
        midPriceUsd: item.assessment.midPriceUsd,
        fillPriceUsd: fill.fillPriceUsd,
        slippageBps: item.assessment.slippageBps,
        entryFeeUsd: fill.entryFeeUsd,
        tokens: fill.tokens,
        liquidityUsd: item.assessment.liquidityUsd,
        gtPriceUsd: snapshot.gtPriceUsd,
        dexPriceUsd: snapshot.dexPriceUsd,
        score: item.assessment.score,
        warnings: item.assessment.warnings,
        lastMark: null,
      };
      book.open.push(position);
      entered.push(position);
      traded.add(snapshot.mint);
      slots -= 1;
      opportunities.push({
        mint: snapshot.mint,
        symbol: snapshot.symbol,
        score: item.assessment.score,
        entered: true,
      });
      pushEvent(book, {
        at: nowIso,
        kind: "entry",
        mint: snapshot.mint,
        detail: `${snapshot.symbol} paper entry score ${item.assessment.score}`,
      });
    }
  }

  if (book.rejects.length > 120) book.rejects.splice(0, book.rejects.length - 120);
  if (book.closed.length > 80) book.closed.splice(0, book.closed.length - 80);

  const pnl = summarizePnl(book);
  pushEvent(book, {
    at: nowIso,
    kind: "cycle",
    mint: null,
    detail: `${args.phase} entered ${entered.length} exited ${exited.length} rejected ${cycleRejects.length}`,
  });

  return {
    book,
    result: {
      ...base,
      ok: true,
      skipped: false,
      reason: null,
      nightId: night.id,
      rehearsal: night.rehearsal,
      entered,
      exited,
      cycleRejects,
      opportunities,
      openCount: book.open.length,
      realizedPnlUsd: pnl.realizedPnlUsd,
      unrealizedPnlUsd: pnl.unrealizedPnlUsd,
      unpricedCloses: pnl.unpricedCloses,
      rejectCounts: rejectCounts(book),
    },
  };
}

function dedupeSnapshots(snapshots: Snapshot[]): Snapshot[] {
  const seen = new Set<string>();
  const out: Snapshot[] = [];
  for (const snapshot of snapshots) {
    if (seen.has(snapshot.mint)) continue;
    seen.add(snapshot.mint);
    out.push(snapshot);
  }
  return out;
}

function momentumFlip(mark: Mark): boolean {
  if (finite(mark.priceChangeM5Pct) && mark.priceChangeM5Pct <= FALLING_KNIFE_M5_PCT) return true;
  const tx = mark.txnsH1;
  if (
    tx &&
    tx.buys > 0 &&
    tx.sells > tx.buys &&
    finite(mark.priceChangeH1Pct) &&
    mark.priceChangeH1Pct < 0
  ) {
    return true;
  }
  return false;
}
