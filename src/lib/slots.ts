import { pickWeighted } from "./rng";

export const SLOT_SYMBOLS = [
  { id: "cherry", label: "Cherry", weight: 28, color: "#c23b4a" },
  { id: "lemon", label: "Lemon", weight: 22, color: "#e2c15a" },
  { id: "plum", label: "Plum", weight: 18, color: "#7a4ea3" },
  { id: "grape", label: "Grape", weight: 14, color: "#5c7ae0" },
  { id: "bell", label: "Bell", weight: 10, color: "#d4b56a" },
  { id: "bar", label: "Bar", weight: 6, color: "#d7d3c8" },
  { id: "seven", label: "Seven", weight: 3, color: "#e23d3d" },
  { id: "diamond", label: "Diamond", weight: 1, color: "#9fe7ff" },
] as const;

export type SlotSymbolId = (typeof SLOT_SYMBOLS)[number]["id"];

export const SLOT_PAYTABLE: Record<SlotSymbolId, { 3: number; 4: number; 5: number }> = {
  cherry: { 3: 5, 4: 15, 5: 50 },
  lemon: { 3: 8, 4: 25, 5: 80 },
  plum: { 3: 10, 4: 40, 5: 120 },
  grape: { 3: 15, 4: 60, 5: 200 },
  bell: { 3: 25, 4: 100, 5: 400 },
  bar: { 3: 50, 4: 200, 5: 800 },
  seven: { 3: 100, 4: 500, 5: 2000 },
  diamond: { 3: 250, 4: 1000, 5: 5000 },
};

export const SLOT_PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
];

export const SLOT_MIN_BET = 5;
export const SLOT_BETS = [5, 10, 25, 50, 100] as const;
export const REEL_COUNT = 5;
export const ROW_COUNT = 3;

export type SlotGrid = SlotSymbolId[][];

export type LineWin = {
  line: number;
  symbol: SlotSymbolId;
  count: number;
  payout: number;
};

export type SlotResult = {
  grid: SlotGrid;
  lineWins: LineWin[];
  totalWin: number;
};

export function pickSymbol(rng: () => number): SlotSymbolId {
  return pickWeighted(rng, SLOT_SYMBOLS).id;
}

export function spinSlots(rng: () => number): SlotGrid {
  return Array.from({ length: REEL_COUNT }, () =>
    Array.from({ length: ROW_COUNT }, () => pickSymbol(rng)),
  );
}

export function evaluateSlots(grid: SlotGrid, totalBet: number): SlotResult {
  const betPerLine = totalBet / SLOT_PAYLINES.length;
  const lineWins: LineWin[] = [];

  SLOT_PAYLINES.forEach((rows, line) => {
    const symbols = rows.map((row, reel) => grid[reel][row]);
    const first = symbols[0];
    let count = 1;
    for (let i = 1; i < symbols.length; i += 1) {
      if (symbols[i] !== first) break;
      count += 1;
    }
    if (count >= 3) {
      const multiplier = SLOT_PAYTABLE[first][count as 3 | 4 | 5];
      lineWins.push({
        line,
        symbol: first,
        count,
        payout: Math.round(betPerLine * multiplier),
      });
    }
  });

  return {
    grid,
    lineWins,
    totalWin: lineWins.reduce((sum, win) => sum + win.payout, 0),
  };
}

export function playSlots(rng: () => number, totalBet: number): SlotResult {
  return evaluateSlots(spinSlots(rng), totalBet);
}

export function winningCells(result: SlotResult): Set<string> {
  const cells = new Set<string>();
  for (const win of result.lineWins) {
    const rows = SLOT_PAYLINES[win.line];
    for (let reel = 0; reel < win.count; reel += 1) {
      cells.add(`${reel}:${rows[reel]}`);
    }
  }
  return cells;
}
