/** Mulberry32 — deterministic RNG for tests and replayable spins. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: () => number, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

export function pickWeighted<T extends { weight: number }>(
  rng: () => number,
  items: readonly T[],
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let ticket = rng() * total;
  for (const item of items) {
    ticket -= item.weight;
    if (ticket < 0) return item;
  }
  return items[items.length - 1];
}
