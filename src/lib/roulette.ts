import { randomInt } from "./rng";

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const ROULETTE_MIN_BET = 5;

export type OutsideBet =
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high"
  | "dozen:1"
  | "dozen:2"
  | "dozen:3"
  | "column:1"
  | "column:2"
  | "column:3";

export type BetId = `straight:${number}` | OutsideBet;

export type BetSlip = Partial<Record<BetId, number>>;

export type PocketColor = "green" | "red" | "black";

export function pocketColor(n: number): PocketColor {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

export function spinWheel(rng: () => number): number {
  return WHEEL_ORDER[randomInt(rng, WHEEL_ORDER.length)];
}

export function betOdds(id: BetId): number {
  if (id.startsWith("straight:")) return 35;
  if (id.startsWith("dozen:") || id.startsWith("column:")) return 2;
  return 1;
}

export function betCovers(id: BetId, n: number): boolean {
  if (id.startsWith("straight:")) {
    return Number(id.slice("straight:".length)) === n;
  }
  if (n === 0) return false;
  switch (id) {
    case "red":
      return pocketColor(n) === "red";
    case "black":
      return pocketColor(n) === "black";
    case "even":
      return n % 2 === 0;
    case "odd":
      return n % 2 === 1;
    case "low":
      return n >= 1 && n <= 18;
    case "high":
      return n >= 19 && n <= 36;
    case "dozen:1":
      return n >= 1 && n <= 12;
    case "dozen:2":
      return n >= 13 && n <= 24;
    case "dozen:3":
      return n >= 25 && n <= 36;
    case "column:1":
      return n % 3 === 1;
    case "column:2":
      return n % 3 === 2;
    case "column:3":
      return n % 3 === 0;
    default:
      return false;
  }
}

export function slipTotal(slip: BetSlip): number {
  return Object.values(slip).reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
}

export function addBet(slip: BetSlip, id: BetId, amount: number): BetSlip {
  if (amount <= 0) return slip;
  return { ...slip, [id]: (slip[id] ?? 0) + amount };
}

export function settleRoulette(winningNumber: number, slip: BetSlip): {
  payout: number;
  winners: BetId[];
} {
  let payout = 0;
  const winners: BetId[] = [];
  for (const [id, amount] of Object.entries(slip) as [BetId, number | undefined][]) {
    if (!amount) continue;
    if (betCovers(id, winningNumber)) {
      winners.push(id);
      payout += amount * (betOdds(id) + 1);
    }
  }
  return { payout, winners };
}

export function straightId(n: number): BetId {
  return `straight:${n}`;
}
