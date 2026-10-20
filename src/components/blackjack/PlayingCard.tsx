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
  const width = small ? "h-[76px] w-[54px]" : "h-[108px] w-[76px]";
  if (hidden || !card) {
    return (
      <div
        className={`${width} card-back rounded-xl border border-gold-500/30 shadow-lg`}
        aria-label="Hidden card"
      />
    );
  }
  const suit = SUIT_MARK[card.suit];
  const tone = suit.red ? "text-burgundy-700" : "text-ink-950";
  return (
    <div
      className={`${width} relative overflow-hidden rounded-xl border border-white/50 bg-cream shadow-lg ${tone}`}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <div className="absolute left-1.5 top-1 leading-none">
        <div className={`${small ? "text-sm" : "text-base"} font-semibold`}>{card.rank}</div>
        <div className={small ? "text-sm" : "text-base"}>{suit.glyph}</div>
      </div>
      <div className={`grid h-full place-items-center ${small ? "text-2xl" : "text-4xl"}`}>
        {suit.glyph}
      </div>
      <div className="absolute bottom-1 right-1.5 rotate-180 leading-none">
        <div className={`${small ? "text-sm" : "text-base"} font-semibold`}>{card.rank}</div>
        <div className={small ? "text-sm" : "text-base"}>{suit.glyph}</div>
      </div>
    </div>
  );
}
