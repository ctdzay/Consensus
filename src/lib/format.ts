export function formatChips(amount: number): string {
  return new Intl.NumberFormat("en-US").format(Math.floor(amount));
}

export function formatPayout(amount: number): string {
  if (amount <= 0) return "0";
  return `+${formatChips(amount)}`;
}
