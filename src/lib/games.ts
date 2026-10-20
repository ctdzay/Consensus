export const GAMES = [
  {
    slug: "slots",
    name: "Night Orchard",
    kind: "Slots",
    minBet: 5,
    edge: "Paytable RTP target ~96%",
    blurb: "Five reels, three lines, and a chandelier of diamonds if the orchard cooperates.",
  },
  {
    slug: "blackjack",
    name: "Salon Privé",
    kind: "Blackjack",
    minBet: 10,
    edge: "S17 · 3:2 blackjack · no surrender",
    blurb: "One table, classic rules. Dealer stands on all 17s. Peek on ace or ten.",
  },
  {
    slug: "roulette",
    name: "Single Zero",
    kind: "Roulette",
    minBet: 5,
    edge: "European wheel · 2.70% house edge",
    blurb: "A 37-pocket wheel and a full outside board. Zero is the house’s quiet friend.",
  },
] as const;
