export const STARTING_BANKROLL = 1_000;
export const REFILL_AMOUNT = 1_000;
export const STORAGE_KEY = "consensus-casino-bankroll-v1";
export const CHIP_VALUES = [5, 25, 100, 500] as const;
export type ChipValue = (typeof CHIP_VALUES)[number];

export function canAfford(balance: number, amount: number): boolean {
  return amount > 0 && amount <= balance;
}

export function debit(balance: number, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
  if (amount > balance) {
    throw new Error("Insufficient chips");
  }
  return roundChips(balance - amount);
}

export function credit(balance: number, amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Credit must be a non-negative number");
  }
  return roundChips(balance + amount);
}

export function roundChips(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function parseStoredBalance(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return roundChips(value);
    }
  } catch {
    return null;
  }
  return null;
}
