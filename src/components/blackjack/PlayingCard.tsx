import type { Card } from "@/lib/blackjack";

const SUIT_MARK: Record<Card["suit"], { glyph: string; red: boolean }> = {
  spades: { glyph: "♠", red: false },
  hearts: { glyph: "♥", red: true },
  diamonds: { glyph: "♦", red: true },
  clubs: { glyph: "♣", red: false },
};

export function PlayingCard({
  card,
  hidden = false,
  small = false,
}: {
  card?: Card;
  hidden?: boolean;
  small?: boolean;
}) {
  const width = small ? "w-[52px] h-[74px]" : "w-[72px] h-[102px]";
  if (hidden || !card) {
    return (
      <div
        className={`${width} card-back rounded-xl border border-gold-500/30 shadow-lg`}
        aria-label="Hidden card"
      />
    );
  }
  const suit = SUIT_MARK[card.suit];
  return (
    <div
      className={`${width} flex flex-col justify-between rounded-xl border border-white/40 bg-cream p-1.5 text-ink-950 shadow-lg`}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <div className={`text-left leading-none ${suit.red ? "text-burgundy-700" : "text-ink-950"}`}>
        <div className={`${small ? "text-sm" : "text-lg"} font-semibold`}>{card.rank}</div>
        <div className={small ? "text-sm" : "text-base"}>{suit.glyph}</div>
      </div>
      <div
        className={`self-end rotate-180 ${suit.red ? "text-burgundy-700" : "text-ink-950"} ${
          small ? "text-sm" : "text-lg"
        }`}
      >
        {card.rank}
      </div>
    </div>
  );
}
