import Link from "next/link";
import { GAMES } from "@/lib/games";

const GAME_ART: Record<string, string> = {
  slots: "from-burgundy-700/40 via-ink-800 to-ink-900",
  blackjack: "from-felt-800 via-ink-800 to-ink-900",
  roulette: "from-gold-700/30 via-ink-800 to-ink-900",
};

export function Lobby() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-14 text-center">
        <p className="text-xs uppercase tracking-[0.42em] text-gold-400">Private tables · no cashier of record</p>
        <h1 className="mt-4 font-display text-5xl leading-tight text-cream md:text-7xl">
          The house is open.
          <span className="block text-gold-400">The chips are imaginary.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-stone md:text-lg">
          Three games, a starting stack of 1,000 play chips, and a refill window if
          the night turns. Nothing here can be cashed out — it is a club for the
          math, the felt, and the click of a wheel.
        </p>
      </section>

      <div className="gold-rule mb-10" />

      <section className="grid gap-6 md:grid-cols-3">
        {GAMES.map((game) => (
          <Link
            key={game.slug}
            href={`/${game.slug}`}
            className="group overflow-hidden rounded-3xl border border-gold-500/20 bg-ink-800 shadow-gold"
          >
            <div className={`h-40 bg-gradient-to-br ${GAME_ART[game.slug]} p-5`}>
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold-300">
                {game.kind}
              </p>
              <p className="mt-10 font-display text-3xl text-cream group-hover:text-gold-200">
                {game.name}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm leading-6 text-stone">{game.blurb}</p>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-gold-400">
                <span>Min {game.minBet}</span>
                <span>{game.edge}</span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
