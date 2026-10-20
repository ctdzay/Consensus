import { describe, expect, it } from "vitest";
import { canAfford, credit, debit, parseStoredBalance } from "./bankroll";

describe("bankroll", () => {
  it("debits and credits chips", () => {
    expect(debit(1000, 250)).toBe(750);
    expect(credit(750, 500)).toBe(1250);
  });

  it("rejects overdrafts and invalid amounts", () => {
    expect(() => debit(100, 101)).toThrow(/Insufficient/);
    expect(() => debit(100, 0)).toThrow(/positive/);
    expect(() => credit(100, -1)).toThrow(/non-negative/);
    expect(canAfford(100, 100)).toBe(true);
    expect(canAfford(100, 101)).toBe(false);
  });

  it("parses stored balances safely", () => {
    expect(parseStoredBalance("1200")).toBe(1200);
    expect(parseStoredBalance('{"nope":true}')).toBeNull();
    expect(parseStoredBalance("not-json")).toBeNull();
    expect(parseStoredBalance("-5")).toBeNull();
  });
});
