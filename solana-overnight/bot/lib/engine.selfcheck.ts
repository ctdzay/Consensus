import assert from "node:assert/strict";
import {
  assessCandidate,
  chicagoClock,
  deskNight,
  PAPER_NOTIONAL_USD,
  runDeskCycle,
  simulateEntry,
  simulateExit,
  slippageBps,
  type Snapshot,
} from "./engine.js";

function passing(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    mint: "So1111111111111111111111111111111111111pump",
    symbol: "MEME",
    name: "Meme",
    dexId: "pumpswap",
    poolAddress: "pool-1",
    poolCreatedAt: "2026-10-18T22:10:00Z",
    gtPriceUsd: 0.001,
    dexPriceUsd: 0.001,
    gtLiquidityUsd: 40_000,
    dexLiquidityUsd: 40_000,
    volumeH1Usd: 8_000,
    txnsH1: { buys: 80, sells: 50, buyers: 40, sellers: 30 },
    priceChangeH1Pct: 12,
    priceChangeM5Pct: 1,
    migrated: true,
    graduationPct: 100,
    creatorWallet: "CreatorWallet111111111111111111111111111111",
    creatorHoldingPct: 2.5,
    holderCount: 150,
    top10Pct: 30,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    honeypot: "no",
    nsfw: false,
    twitter: true,
    telegram: false,
    website: true,
    descriptionChars: 120,
    pumpListed: true,
    ...overrides,
  };
}

function main() {
  const tenPmCdt = chicagoClock(new Date("2026-10-19T03:00:00Z"));
  assert.equal(tenPmCdt.hour, 22);
  assert.equal(tenPmCdt.isoDate, "2026-10-18");
  assert.deepEqual(deskNight(tenPmCdt, "scan", false), {
    id: "2026-10-18",
    rehearsal: false,
  });

  const sixAmCdt = chicagoClock(new Date("2026-10-19T11:00:00Z"));
  assert.equal(sixAmCdt.hour, 6);
  assert.equal(sixAmCdt.isoDate, "2026-10-19");
  assert.deepEqual(deskNight(sixAmCdt, "report", false), {
    id: "2026-10-18",
    rehearsal: false,
  });
  assert.equal(deskNight(sixAmCdt, "scan", false), null);

  const tenPmCst = chicagoClock(new Date("2026-12-15T04:00:00Z"));
  assert.equal(tenPmCst.hour, 22);
  assert.equal(tenPmCst.isoDate, "2026-12-14");
  const sixAmCst = chicagoClock(new Date("2026-12-15T12:00:00Z"));
  assert.equal(sixAmCst.hour, 6);
  assert.deepEqual(deskNight(sixAmCst, "report", false), {
    id: "2026-12-14",
    rehearsal: false,
  });

  const afternoon = chicagoClock(new Date("2026-10-18T18:00:00Z"));
  assert.equal(deskNight(afternoon, "scan", false), null);
  assert.equal(deskNight(afternoon, "scan", true)?.rehearsal, true);

  const good = assessCandidate(passing());
  assert.equal(good.decision, "pass");
  if (good.decision !== "pass") return;
  assert.ok(good.slippageBps >= 15 && good.slippageBps <= 200);
  assert.equal(slippageBps(100, 40_000), 50);

  const thinHolders = assessCandidate(passing({ holderCount: 23, top10Pct: 96 }));
  assert.equal(thinHolders.decision, "reject");
  if (thinHolders.decision === "reject") {
    assert.ok(thinHolders.reasons.includes("incomplete_holders"));
  }

  const creatorHeavy = assessCandidate(passing({ creatorHoldingPct: 20 }));
  assert.equal(creatorHeavy.decision, "reject");
  if (creatorHeavy.decision === "reject") {
    assert.ok(creatorHeavy.reasons.includes("creator_concentration"));
  }

  const concentrated = assessCandidate(passing({ top10Pct: 80 }));
  assert.equal(concentrated.decision, "reject");
  if (concentrated.decision === "reject") {
    assert.ok(concentrated.reasons.includes("holder_concentration"));
  }

  const incomplete = assessCandidate(
    passing({ dexPriceUsd: null, creatorWallet: null, holderCount: null, top10Pct: null }),
  );
  assert.equal(incomplete.decision, "reject");
  if (incomplete.decision === "reject") {
    assert.ok(incomplete.reasons.includes("incomplete_market"));
    assert.ok(incomplete.reasons.includes("incomplete_creator"));
    assert.ok(incomplete.reasons.includes("incomplete_holders"));
  }

  const curve = assessCandidate(passing({ migrated: false, graduationPct: 40, dexId: "pump-fun" }));
  assert.equal(curve.decision, "reject");
  if (curve.decision === "reject") {
    assert.ok(curve.reasons.includes("not_migrated"));
  }

  const fill = simulateEntry(good.midPriceUsd, good.slippageBps);
  assert.ok(fill.fillPriceUsd > good.midPriceUsd);
  assert.ok(fill.entryFeeUsd > 0);
  assert.ok(fill.tokens > 0);
  const flatExit = simulateExit(fill.tokens, good.midPriceUsd, good.slippageBps);
  const flatPnl = flatExit.proceedsUsd - PAPER_NOTIONAL_USD;
  assert.ok(flatPnl < 0, "round trip at the same mid is a loss after slippage and fees");
  assert.ok(flatPnl > PAPER_NOTIONAL_USD * -0.12, "same-mid round trip stays inside the stop");

  const night = new Date("2026-10-19T04:00:00Z");
  const opened = runDeskCycle({
    now: night,
    phase: "scan",
    force: false,
    book: null,
    candidates: [
      passing(),
      passing({
        mint: "RejectMint111111111111111111111111111111pump",
        symbol: "THIN",
        holderCount: 10,
        top10Pct: 99,
      }),
    ],
    marks: {},
    universeError: null,
  });
  assert.equal(opened.result.skipped, false);
  assert.equal(opened.result.entered.length, 1);
  assert.equal(opened.result.entered[0].symbol, "MEME");
  assert.equal(opened.result.cycleRejects.length, 1);
  assert.equal(opened.result.liveTrading, false);
  assert.ok(opened.book);

  const dumped = runDeskCycle({
    now: new Date("2026-10-19T05:00:00Z"),
    phase: "scan",
    force: false,
    book: opened.book,
    candidates: [],
    marks: {
      [passing().mint]: {
        gtPriceUsd: 0.0008,
        dexPriceUsd: 0.0008,
        gtLiquidityUsd: 40_000,
        dexLiquidityUsd: 40_000,
        priceChangeM5Pct: -2,
        priceChangeH1Pct: -20,
        txnsH1: { buys: 40, sells: 70, buyers: 30, sellers: 40 },
      },
    },
    universeError: null,
  });
  assert.equal(dumped.result.exited.length, 1);
  assert.equal(dumped.result.exited[0].exitReason, "stop_loss");
  assert.ok((dumped.result.exited[0].realizedPnlUsd ?? 0) < 0);
  assert.ok((dumped.result.realizedPnlUsd ?? 0) < 0);

  const again = runDeskCycle({
    now: new Date("2026-10-19T03:30:00Z"),
    phase: "scan",
    force: false,
    book: null,
    candidates: [passing({ mint: "WinnerMint111111111111111111111111111111pump", symbol: "WIN" })],
    marks: {},
    universeError: null,
  });
  const held = runDeskCycle({
    now: new Date("2026-10-19T04:30:00Z"),
    phase: "scan",
    force: false,
    book: again.book,
    candidates: [],
    marks: {
      WinnerMint111111111111111111111111111111pump: {
        gtPriceUsd: 0.00105,
        dexPriceUsd: 0.00105,
        gtLiquidityUsd: 40_000,
        dexLiquidityUsd: 40_000,
        priceChangeM5Pct: 1,
        priceChangeH1Pct: 5,
        txnsH1: { buys: 60, sells: 40, buyers: 30, sellers: 20 },
      },
    },
    universeError: null,
  });
  assert.equal(held.result.exited.length, 0);
  assert.equal(held.result.openCount, 1);
  assert.ok((held.book?.open[0].lastMark?.unrealizedPnlUsd ?? 0) !== 0);

  const morning = runDeskCycle({
    now: new Date("2026-10-19T11:00:00Z"),
    phase: "report",
    force: false,
    book: held.book,
    candidates: [],
    marks: {
      WinnerMint111111111111111111111111111111pump: {
        gtPriceUsd: 0.00105,
        dexPriceUsd: 0.00105,
        gtLiquidityUsd: 40_000,
        dexLiquidityUsd: 40_000,
        priceChangeM5Pct: 0,
        priceChangeH1Pct: 4,
        txnsH1: { buys: 50, sells: 40, buyers: 25, sellers: 20 },
      },
    },
    universeError: null,
  });
  assert.equal(morning.result.skipped, false);
  assert.equal(morning.result.exited.length, 1);
  assert.equal(morning.result.exited[0].exitReason, "morning_flatten");
  assert.equal(morning.result.entered.length, 0);
  assert.notEqual(morning.result.exited[0].realizedPnlUsd, null);

  const daytime = runDeskCycle({
    now: new Date("2026-10-18T18:00:00Z"),
    phase: "scan",
    force: false,
    book: null,
    candidates: [passing()],
    marks: {},
    universeError: null,
  });
  assert.equal(daytime.result.skipped, true);
  assert.equal(daytime.result.reason, "outside_window");
  assert.equal(daytime.result.entered.length, 0);

  console.log("engine self-check ok");
}

main();
