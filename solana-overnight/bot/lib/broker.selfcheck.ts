import assert from "node:assert/strict";
import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import type { HostKvApi, JsonValue } from "@cursor/bdk";
import {
  clampSlippageBps,
  readLiveConfig,
  swapExactIn,
  usdcRaw,
} from "./broker.js";
import { PAPER_NOTIONAL_USD, type Book, type CycleResult, type PaperPosition } from "./engine.js";
import { settleLiveOrders, type SwapClient } from "./settle.js";

function memoryKv(): HostKvApi {
  const store = new Map<string, JsonValue>();
  return {
    async get(key) {
      return store.get(key);
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

function position(notional = PAPER_NOTIONAL_USD): PaperPosition {
  return {
    id: "2026-10-18:Mint111111111111111111111111111111111111pump",
    mint: "Mint111111111111111111111111111111111111pump",
    symbol: "MEME",
    name: "Meme",
    poolAddress: "pool",
    creatorWallet: "creator",
    openedAt: "2026-10-19T03:00:00Z",
    notionalUsd: notional,
    midPriceUsd: 0.001,
    fillPriceUsd: 0.001,
    slippageBps: 80,
    entryFeeUsd: 0.28,
    tokens: 100_000,
    liquidityUsd: 40_000,
    gtPriceUsd: 0.001,
    dexPriceUsd: 0.001,
    score: 80,
    warnings: [],
    lastMark: null,
  };
}

function result(entered: PaperPosition[]): CycleResult {
  return {
    ok: true,
    skipped: false,
    reason: null,
    paperTrading: true,
    liveTrading: false,
    chicago: "2026-10-18 22:00 America/Chicago",
    nightId: "2026-10-18",
    rehearsal: false,
    phase: "scan",
    entered,
    exited: [],
    cycleRejects: [],
    opportunities: [{ mint: entered[0]?.mint ?? "mint", symbol: "MEME", score: 80, entered: true }],
    openCount: entered.length,
    realizedPnlUsd: null,
    unrealizedPnlUsd: null,
    unpricedCloses: 0,
    rejectCounts: {},
    assumptions: {
      feeModel: "fee-model-2026-10",
      notionalUsd: PAPER_NOTIONAL_USD,
      dexFeeBpsPerSide: 25,
      networkFeeUsdPerSide: 0.03,
      slippage: "model",
      liveTrading: false,
    },
    riskWarnings: [],
    universeError: null,
  };
}

function book(open: PaperPosition[], rehearsal = false): Book {
  return {
    nightId: rehearsal ? "rehearsal-2026-10-18" : "2026-10-18",
    rehearsal,
    cycles: 1,
    updatedAt: "2026-10-19T03:00:00Z",
    open,
    closed: [],
    rejects: [],
    events: [],
    assumptions: {
      feeModel: "fee-model-2026-10",
      notionalUsd: PAPER_NOTIONAL_USD,
      dexFeeBpsPerSide: 25,
      networkFeeUsdPerSide: 0.03,
      slippage: "model",
      liveTrading: false,
    },
  };
}

function unsignedTx(payer: Keypair): string {
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: "11111111111111111111111111111111",
    instructions: [
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 0,
      }),
    ],
  }).compileToV0Message();
  return Buffer.from(new VersionedTransaction(message).serialize()).toString("base64");
}

async function main() {
  assert.equal(clampSlippageBps(10), 50);
  assert.equal(clampSlippageBps(900), 200);
  assert.equal(usdcRaw(100), "100000000");
  assert.equal(usdcRaw(0), null);

  const off = readLiveConfig({});
  assert.equal(off.armed, false);
  assert.equal(off.reason, "LIVE_TRADING is off");

  const flagged = readLiveConfig({ LIVE_TRADING: "1" });
  assert.equal(flagged.armed, false);
  assert.match(flagged.reason ?? "", /SOLANA_SECRET_KEY/);

  const disarmed = await swapExactIn(
    {
      inputMint: "in",
      outputMint: "out",
      amountRaw: "1",
      slippageBps: 50,
    },
    {},
    async () => {
      throw new Error("network");
    },
  );
  assert.equal(disarmed.ok, false);

  const payer = Keypair.generate();
  const env = {
    LIVE_TRADING: "1",
    SOLANA_SECRET_KEY: bs58.encode(payer.secretKey),
  };
  const armed = readLiveConfig(env);
  assert.equal(armed.armed, true);
  assert.equal(armed.publicKey, payer.publicKey.toBase58());

  let executeBody = "";
  const swapped = await swapExactIn(
    {
      inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      outputMint: payer.publicKey.toBase58(),
      amountRaw: "100000000",
      slippageBps: 80,
    },
    env,
    async (input, init) => {
      const url = String(input);
      if (url.includes("/order")) {
        return new Response(
          JSON.stringify({
            transaction: unsignedTx(payer),
            requestId: "req-1",
            lastValidBlockHeight: "123",
          }),
          { status: 200 },
        );
      }
      executeBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          status: "Success",
          signature: "sig-1",
          totalInputAmount: "100000000",
          totalOutputAmount: "999",
        }),
        { status: 200 },
      );
    },
  );
  assert.equal(swapped.ok, true);
  if (swapped.ok) assert.equal(swapped.signature, "sig-1");
  const posted = JSON.parse(executeBody) as { signedTransaction: string; requestId: string };
  assert.equal(posted.requestId, "req-1");
  const signed = VersionedTransaction.deserialize(Buffer.from(posted.signedTransaction, "base64"));
  assert.ok(signed.signatures.some((item) => item.some((byte) => byte !== 0)));

  const calls: string[] = [];
  const client: SwapClient = {
    config: armed,
    async swap(request) {
      calls.push(request.amountRaw);
      return {
        ok: true,
        signature: "sig-buy",
        inputAmountRaw: request.amountRaw,
        outputAmountRaw: "5000000",
      };
    },
    async tokenRaw() {
      return "9000000";
    },
    async decimals() {
      return 6;
    },
  };
  const open = position(250);
  const settled = await settleLiveOrders(memoryKv(), book([open]), result([open]), client);
  assert.equal(settled.liveTrading, true);
  assert.equal(settled.paperTrading, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], usdcRaw(PAPER_NOTIONAL_USD));
  assert.equal(settled.entered[0]?.liveFill?.signature, "sig-buy");
  assert.equal(settled.entered[0]?.tokens, 5);

  const rehearsalCalls: string[] = [];
  const rehearsal = await settleLiveOrders(
    memoryKv(),
    book([open], true),
    result([open]),
    {
      ...client,
      async swap() {
        rehearsalCalls.push("swap");
        return { ok: false, error: "should_not_run" };
      },
    },
  );
  assert.equal(rehearsal.liveTrading, false);
  assert.deepEqual(rehearsalCalls, []);

  const failed = await settleLiveOrders(memoryKv(), book([position()]), result([position()]), {
    ...client,
    async swap() {
      return { ok: false, error: "rejected" };
    },
  });
  assert.equal(failed.entered.length, 0);
  assert.equal(failed.liveTrading, true);

  const held = position();
  held.liveFill = {
    signature: "sig-buy",
    inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    outputMint: held.mint,
    inputAmountRaw: "100000000",
    outputAmountRaw: "5000000",
  };
  const closed = {
    ...held,
    closedAt: "2026-10-19T11:00:00Z",
    exitReason: "morning_flatten" as const,
    exitMidPriceUsd: 0.001,
    exitFillPriceUsd: 0.001,
    exitSlippageBps: 40,
    exitFeeUsd: 0.28,
    exitLiquidityUsd: 40_000,
    proceedsUsd: null,
    realizedPnlUsd: null,
  };
  const sellAmounts: string[] = [];
  const soldBook = book([]);
  soldBook.open = [];
  soldBook.closed = [closed];
  const sold = await settleLiveOrders(
    memoryKv(),
    soldBook,
    { ...result([]), exited: [closed], entered: [] },
    {
      ...client,
      async tokenRaw() {
        return "9000000";
      },
      async swap(request) {
        sellAmounts.push(request.amountRaw);
        return {
          ok: true,
          signature: "sig-sell",
          inputAmountRaw: request.amountRaw,
          outputAmountRaw: "110000000",
        };
      },
    },
  );
  assert.deepEqual(sellAmounts, ["5000000"]);
  assert.equal(sold.exited[0]?.exitFill?.signature, "sig-sell");
  assert.equal(sold.exited[0]?.proceedsUsd, 110);

  console.log("broker self-check ok");
}

main();
