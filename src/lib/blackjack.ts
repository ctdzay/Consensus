import { randomInt } from "./rng";

export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export type Card = {
  suit: Suit;
  rank: Rank;
};

export type HandValue = {
  total: number;
  soft: boolean;
  blackjack: boolean;
  bust: boolean;
};

export type BlackjackPhase =
  | "betting"
  | "player"
  | "dealer"
  | "settled";

export type BlackjackOutcome = "blackjack" | "win" | "lose" | "push" | "bust";

export const BJ_MIN_BET = 10;
export const BJ_BETS = [10, 25, 50, 100, 250] as const;

export function createShoe(rng: () => number, decks = 1): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ suit, rank });
      }
    }
  }
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function draw(shoe: Card[]): { card: Card; shoe: Card[] } {
  const [card, ...rest] = shoe;
  if (!card) throw new Error("Shoe is empty");
  return { card, shoe: rest };
}

export function rankValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J") return 10;
  return Number(rank);
}

export function evaluateHand(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") aces += 1;
    total += rankValue(card.rank);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return {
    total,
    soft: aces > 0 && total <= 21,
    blackjack: cards.length === 2 && total === 21,
    bust: total > 21,
  };
}

export function isTenValue(card: Card): boolean {
  return rankValue(card.rank) === 10;
}

export function dealerShouldHit(cards: Card[]): boolean {
  const value = evaluateHand(cards);
  return value.total < 17;
}

export function settleBlackjack(player: Card[], dealer: Card[], bet: number): {
  outcome: BlackjackOutcome;
  payout: number;
} {
  const p = evaluateHand(player);
  const d = evaluateHand(dealer);

  if (p.bust) return { outcome: "bust", payout: 0 };
  if (p.blackjack && d.blackjack) return { outcome: "push", payout: bet };
  if (p.blackjack) return { outcome: "blackjack", payout: bet + Math.floor(bet * 1.5) };
  if (d.blackjack) return { outcome: "lose", payout: 0 };
  if (d.bust) return { outcome: "win", payout: bet * 2 };
  if (p.total > d.total) return { outcome: "win", payout: bet * 2 };
  if (p.total < d.total) return { outcome: "lose", payout: 0 };
  return { outcome: "push", payout: bet };
}

export function dealerPeekShouldEnd(dealer: Card[]): boolean {
  if (dealer.length < 2) return false;
  const up = dealer[0];
  if (up.rank !== "A" && !isTenValue(up)) return false;
  return evaluateHand(dealer).blackjack;
}
