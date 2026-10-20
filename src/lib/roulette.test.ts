import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rng";
import {
  WHEEL_ORDER,
  addBet,
  betCovers,
  pocketColor,
  settleRoulette,
  slipTotal,
  spinWheel,
  straightId,
} from "./roulette";

describe("roulette", () => {
  it("colors pockets correctly", () => {
    expect(pocketColor(0)).toBe("green");
    expect(pocketColor(1)).toBe("red");
    expect(pocketColor(2)).toBe("black");
    expect(WHEEL_ORDER).toHaveLength(37);
  });

  it("covers even-money, dozens, and columns, excluding zero", () => {
    expect(betCovers("red", 1)).toBe(true);
    expect(betCovers("black", 1)).toBe(false);
    expect(betCovers("even", 0)).toBe(false);
    expect(betCovers("even", 2)).toBe(true);
    expect(betCovers("low", 18)).toBe(true);
    expect(betCovers("high", 19)).toBe(true);
    expect(betCovers("dozen:2", 24)).toBe(true);
    expect(betCovers("column:1", 34)).toBe(true);
    expect(betCovers("column:3", 36)).toBe(true);
    expect(betCovers("column:3", 0)).toBe(false);
  });

  it("pays 35:1 on a straight and 1:1 on red, returning stake plus winnings", () => {
    const slip = addBet(addBet({}, straightId(19), 10), "red", 20);
    expect(slipTotal(slip)).toBe(30);
    expect(settleRoulette(19, slip)).toEqual({
      payout: 10 * 36 + 20 * 2,
      winners: [straightId(19), "red"],
    });
    expect(settleRoulette(0, slip)).toEqual({ payout: 0, winners: [] });
    expect(settleRoulette(0, { [straightId(0)]: 5 })).toEqual({
      payout: 180,
      winners: [straightId(0)],
    });
  });

  it("spins a pocket from the wheel order", () => {
    const n = spinWheel(mulberry32(3));
    expect(WHEEL_ORDER.includes(n as (typeof WHEEL_ORDER)[number])).toBe(true);
  });
});
