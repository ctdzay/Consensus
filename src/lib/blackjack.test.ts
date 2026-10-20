import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rng";
import {
  createShoe,
  dealerPeekShouldEnd,
  dealerShouldHit,
  evaluateHand,
  settleBlackjack,
  type Card,
} from "./blackjack";

function c(rank: Card["rank"], suit: Card["suit"] = "spades"): Card {
  return { rank, suit };
}

describe("blackjack", () => {
  it("values blackjack, soft totals, and busts", () => {
    expect(evaluateHand([c("A"), c("K")])).toMatchObject({
      total: 21,
      blackjack: true,
      bust: false,
    });
    expect(evaluateHand([c("A"), c("6")])).toMatchObject({ total: 17, soft: true });
    expect(evaluateHand([c("A"), c("6"), c("10")])).toMatchObject({
      total: 17,
      soft: false,
    });
    expect(evaluateHand([c("10"), c("6"), c("6")])).toMatchObject({
      total: 22,
      bust: true,
    });
  });

  it("stands the dealer on all 17s", () => {
    expect(dealerShouldHit([c("10"), c("7")])).toBe(false);
    expect(dealerShouldHit([c("A"), c("6")])).toBe(false);
    expect(dealerShouldHit([c("10"), c("6")])).toBe(true);
  });

  it("settles standard outcomes", () => {
    expect(settleBlackjack([c("A"), c("K")], [c("9"), c("9")], 100)).toEqual({
      outcome: "blackjack",
      payout: 250,
    });
    expect(settleBlackjack([c("A"), c("K")], [c("A"), c("Q")], 100)).toEqual({
      outcome: "push",
      payout: 100,
    });
    expect(settleBlackjack([c("10"), c("8"), c("4")], [c("10"), c("7")], 50)).toEqual({
      outcome: "bust",
      payout: 0,
    });
    expect(settleBlackjack([c("10"), c("9")], [c("10"), c("5"), c("7")], 40)).toEqual({
      outcome: "win",
      payout: 80,
    });
    expect(settleBlackjack([c("10"), c("8")], [c("10"), c("9")], 40)).toEqual({
      outcome: "lose",
      payout: 0,
    });
  });

  it("peeks for dealer blackjack on ace or ten", () => {
    expect(dealerPeekShouldEnd([c("A"), c("K")])).toBe(true);
    expect(dealerPeekShouldEnd([c("K"), c("A")])).toBe(true);
    expect(dealerPeekShouldEnd([c("9"), c("A")])).toBe(false);
  });

  it("shuffles a 52-card shoe deterministically", () => {
    const shoe = createShoe(mulberry32(99));
    expect(shoe).toHaveLength(52);
    expect(createShoe(mulberry32(99))).toEqual(shoe);
    const unique = new Set(shoe.map((card) => `${card.rank}${card.suit}`));
    expect(unique.size).toBe(52);
  });
});
