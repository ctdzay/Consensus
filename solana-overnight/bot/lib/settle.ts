import { supportsKvCas, type HostKvApi, type JsonValue } from "@cursor/bdk";
import {
  USDC_MINT,
  clampSlippageBps,
  mintDecimals,
  ownerTokenRaw,
  readLiveConfig,
  swapExactIn,
  usdcRaw,
  type LiveConfig,
  type SwapRequest,
  type SwapResult,
} from "./broker.js";
import {
  PAPER_NOTIONAL_USD,
  summarizePnl,
  type Book,
  type ClosedTrade,
  type CycleResult,
  type LiveFill,
  type PaperPosition,
} from "./engine.js";

export type SwapClient = {
  config: LiveConfig;
  swap: (request: SwapRequest) => Promise<SwapResult>;
  tokenRaw: (owner: string, mint: string) => Promise<string | null>;
  decimals: (mint: string) => Promise<number | null>;
};

export function jupiterClient(env: NodeJS.ProcessEnv = process.env): SwapClient {
  const config = readLiveConfig(env);
  return {
    config,
    swap: (request) => swapExactIn(request, env),
    tokenRaw: (owner, mint) => ownerTokenRaw(owner, mint, config.rpcUrl),
    decimals: (mint) => mintDecimals(mint, config.rpcUrl),
  };
}

export async function settleLiveOrders(
  kv: HostKvApi,
  book: Book,
  result: CycleResult,
  client: SwapClient = jupiterClient(),
): Promise<CycleResult> {
  if (result.skipped || book.rehearsal || !client.config.armed || !client.config.publicKey) {
    return result;
  }

  for (const closed of [...result.exited]) {
    const sold = await sellLive(kv, client, closed);
    if (sold === "paper") continue;
    if (sold === "failed") {
      restore(book, result, closed);
      push(book, closed.mint, `${closed.symbol} live sell failed; position stays open`);
      continue;
    }
    closed.exitFill = sold;
    const proceeds = Number(sold.outputAmountRaw) / 1_000_000;
    if (Number.isFinite(proceeds)) {
      closed.proceedsUsd = Math.round(proceeds * 100) / 100;
      closed.realizedPnlUsd = Math.round((proceeds - closed.notionalUsd) * 100) / 100;
    }
    push(book, closed.mint, `${closed.symbol} live sell ${sold.signature}`);
  }

  for (const position of [...result.entered]) {
    const bought = await buyLive(kv, client, position);
    if (!bought) {
      dropEntry(book, result, position);
      push(book, position.mint, `${position.symbol} live buy failed; no position opened`);
      continue;
    }
    position.liveFill = bought;
    const decimals = await client.decimals(position.mint);
    if (decimals != null) {
      position.tokens = Number(bought.outputAmountRaw) / 10 ** decimals;
    }
    push(book, position.mint, `${position.symbol} live buy ${bought.signature}`);
  }

  book.assumptions = { ...book.assumptions, liveTrading: true };
  const pnl = summarizePnl(book);
  return {
    ...result,
    paperTrading: false,
    liveTrading: true,
    assumptions: book.assumptions,
    entered: result.entered,
    exited: result.exited,
    openCount: book.open.length,
    realizedPnlUsd: pnl.realizedPnlUsd,
    unrealizedPnlUsd: pnl.unrealizedPnlUsd,
    unpricedCloses: pnl.unpricedCloses,
    riskWarnings: [
      `Operator wallet ${client.config.publicKey} trades USDC on the overnight schedule. Chat is not an approved wallet path.`,
      "A failed live order is not recorded as an open position. Rehearsals stay paper.",
      "Indexer data can lag. When GeckoTerminal and DexScreener disagree beyond the gate, the token is rejected.",
      "Top-10 holder share includes AMM vaults, so a fresh migration with few holders is rejected as incomplete.",
    ],
  };
}

async function sellLive(
  kv: HostKvApi,
  client: SwapClient,
  closed: ClosedTrade,
): Promise<LiveFill | "paper" | "failed"> {
  const recorded = closed.liveFill?.outputAmountRaw;
  if (!recorded || !/^[1-9][0-9]*$/.test(recorded)) return "paper";
  const owner = client.config.publicKey;
  if (!owner) return "failed";
  const balance = await client.tokenRaw(owner, closed.mint);
  const amountRaw = sellAmount(recorded, balance);
  if (!amountRaw) return "failed";
  const fill = await once(kv, fillKey(closed.id, "sell"), () =>
    client.swap({
      inputMint: closed.mint,
      outputMint: USDC_MINT,
      amountRaw,
      slippageBps: clampSlippageBps(closed.exitSlippageBps),
    }),
  );
  if (!fill) return "failed";
  return { ...fill, inputMint: closed.mint, outputMint: USDC_MINT };
}

async function buyLive(
  kv: HostKvApi,
  client: SwapClient,
  position: PaperPosition,
): Promise<LiveFill | null> {
  const amountRaw = usdcRaw(Math.min(position.notionalUsd, PAPER_NOTIONAL_USD));
  if (!amountRaw) return null;
  const fill = await once(kv, fillKey(position.id, "buy"), () =>
    client.swap({
      inputMint: USDC_MINT,
      outputMint: position.mint,
      amountRaw,
      slippageBps: clampSlippageBps(position.slippageBps),
    }),
  );
  if (!fill) return null;
  return { ...fill, inputMint: USDC_MINT, outputMint: position.mint };
}

function sellAmount(recorded: string, balance: string | null): string | null {
  if (balance == null) return recorded;
  if (!/^[0-9]+$/.test(balance) || balance === "0") return null;
  return BigInt(balance) < BigInt(recorded) ? balance : recorded;
}

function fillKey(id: string, side: "buy" | "sell"): string {
  return `desk:fill:${id}:${side}`;
}

async function once(
  kv: HostKvApi,
  key: string,
  run: () => Promise<SwapResult>,
): Promise<LiveFill | null> {
  const existing = asFill(await kv.get(key));
  if (existing) return existing;
  if (supportsKvCas(kv)) {
    const reserved = await kv.putIfAbsent(key, { status: "reserved" });
    if (!reserved.ok) return asFill(await kv.get(key));
  }
  const result = await run();
  if (!result.ok) {
    await kv.delete(key);
    return null;
  }
  const fill: LiveFill = {
    signature: result.signature,
    inputMint: "",
    outputMint: "",
    inputAmountRaw: result.inputAmountRaw,
    outputAmountRaw: result.outputAmountRaw,
  };
  await kv.put(key, {
    status: "filled",
    signature: fill.signature,
    inputAmountRaw: fill.inputAmountRaw,
    outputAmountRaw: fill.outputAmountRaw,
  });
  return fill;
}

function asFill(value: JsonValue | undefined): LiveFill | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, JsonValue>;
  if (row.status !== "filled" || typeof row.signature !== "string") return null;
  if (typeof row.inputAmountRaw !== "string" || typeof row.outputAmountRaw !== "string") {
    return null;
  }
  return {
    signature: row.signature,
    inputMint: "",
    outputMint: "",
    inputAmountRaw: row.inputAmountRaw,
    outputAmountRaw: row.outputAmountRaw,
  };
}

function restore(book: Book, result: CycleResult, closed: ClosedTrade) {
  book.closed = book.closed.filter((trade) => trade.id !== closed.id);
  result.exited = result.exited.filter((trade) => trade.id !== closed.id);
  const {
    closedAt: _closedAt,
    exitReason: _exitReason,
    exitMidPriceUsd: _exitMid,
    exitFillPriceUsd: _exitFillPrice,
    exitSlippageBps: _exitSlip,
    exitFeeUsd: _exitFee,
    exitLiquidityUsd: _exitLiquidity,
    proceedsUsd: _proceeds,
    realizedPnlUsd: _pnl,
    exitFill: _exitFill,
    ...position
  } = closed;
  if (!book.open.some((item) => item.id === position.id)) book.open.push(position);
}

function dropEntry(book: Book, result: CycleResult, position: PaperPosition) {
  book.open = book.open.filter((item) => item.id !== position.id);
  result.entered = result.entered.filter((item) => item.id !== position.id);
  for (const opportunity of result.opportunities) {
    if (opportunity.mint === position.mint) opportunity.entered = false;
  }
}

function push(book: Book, mint: string, detail: string) {
  book.events.push({ at: book.updatedAt, kind: "cycle", mint, detail });
}
