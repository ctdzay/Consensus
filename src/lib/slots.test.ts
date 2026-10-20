import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rng";
import {
  SLOT_PAYLINES,
  evaluateSlots,
  playSlots,
  spinSlots,
  winningCells,
  type SlotGrid,
  type SlotSymbolId,
} from "./slots";

function gridFromRows(rows: SlotSymbolId[][]): SlotGrid {
  return [0, 1, 2, 3, 4].map((reel) => rows.map((row) => row[reel]));
}

describe("slots", () => {
  it("pays three cherries on the middle line", () => {
    const grid = gridFromRows([
      ["bar", "lemon", "plum", "grape", "bell"],
      ["cherry", "cherry", "cherry", "lemon", "lemon"],
      ["seven", "bar", "grape", "plum", "bell"],
    ]);
    const result = evaluateSlots(grid, 15);
    expect(result.lineWins).toEqual([
      { line: 0, symbol: "cherry", count: 3, payout: 25 },
    ]);
    expect(result.totalWin).toBe(25);
    expect([...winningCells(result)]).toEqual(["0:1", "1:1", "2:1"]);
  });

  it("pays five diamonds across a line at the 5000x rate per-line bet", () => {
    const grid = gridFromRows([
      ["diamond", "diamond", "diamond", "diamond", "diamond"],
      ["cherry", "lemon", "plum", "grape", "bell"],
      ["bar", "seven", "grape", "plum", "bell"],
    ]);
    const result = evaluateSlots(grid, 15);
    expect(result.lineWins[0]).toMatchObject({ line: 1, symbol: "diamond", count: 5, payout: 25000 });
  });

  it("does not pay two-of-a-kind", () => {
    const grid = gridFromRows([
      ["seven", "seven", "bar", "bar", "bar"],
      ["lemon", "plum", "grape", "bell", "bar"],
      ["cherry", "lemon", "plum", "grape", "bell"],
    ]);
    expect(evaluateSlots(grid, 15).totalWin).toBe(0);
  });

  it("produces a 5x3 grid and stays deterministic with a seed", () => {
    const a = spinSlots(mulberry32(42));
    const b = spinSlots(mulberry32(42));
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    expect(a[0]).toHaveLength(3);
    expect(SLOT_PAYLINES).toHaveLength(3);
    const played = playSlots(mulberry32(7), 15);
    expect(played.totalWin).toBeGreaterThanOrEqual(0);
  });
});
