"use client";

import { useMemo, useState } from "react";
import { useBankroll } from "@/components/BankrollProvider";
import { PlayingCard } from "@/components/blackjack/PlayingCard";
import { formatChips } from "@/lib/format";
import {
  BJ_BETS,
  BJ_MIN_BET,
  createShoe,
  dealerPeekShouldEnd,
  dealerShouldHit,
  draw,
  evaluateHand,
  settleBlackjack,
  type BlackjackOutcome,
  type BlackjackPhase,
  type Card,
} from "@/lib/blackjack";

type TableState = {
  phase: BlackjackPhase;
  bet: number;
  shoe: Card[];
  player: Card[];
  dealer: Card[];
  doubled: boolean;
  outcome: BlackjackOutcome | null;
  payout: number;
};

function freshTable(): TableState {
  return {
    phase: "betting",
    bet: BJ_MIN_BET,
    shoe: [],
    player: [],
    dealer: [],
    doubled: false,
    outcome: null,
    payout: 0,
  };
}

function outcomeCopy(outcome: BlackjackOutcome, payout: number): string {
  switch (outcome) {
    case "blackjack":
      return `Blackjack. The salon pays 3:2 — ${payout} chips return.`;
    case "win":
      return `The player stands taller. ${payout} chips come back.`;
    case "push":
      return "A tie. The bet is returned.";
    case "bust":
      return "The hand ran past 21.";
    case "lose":
      return "The dealer takes the pot.";
  }
}

export function BlackjackTable() {
  const { balance, debit, credit, canAfford } = useBankroll();
  const [table, setTable] = useState<TableState>(freshTable);
  const [message, setMessage] = useState("Place a bet. Dealer stands on all 17s.");

  const playerValue = useMemo(() => evaluateHand(table.player), [table.player]);
  const dealerValue = useMemo(() => evaluateHand(table.dealer), [table.dealer]);
  const hideHole = table.phase === "player";

  const deal = () => {
    if (table.phase !== "betting") return;
    if (!canAfford(table.bet) || !debit(table.bet)) {
      setMessage("Not enough chips for that chair.");
      return;
    }
    let shoe = createShoe(Math.random);
    const player: Card[] = [];
    const dealer: Card[] = [];
    ({ card: player[0], shoe } = draw(shoe));
    ({ card: dealer[0], shoe } = draw(shoe));
    const secondPlayer = draw(shoe);
    player[1] = secondPlayer.card;
    shoe = secondPlayer.shoe;
    const secondDealer = draw(shoe);
    dealer[1] = secondDealer.card;
    shoe = secondDealer.shoe;

    const peek = dealerPeekShouldEnd(dealer);
    const playerBJ = evaluateHand(player).blackjack;

    if (peek || playerBJ) {
      const { outcome, payout } = settleBlackjack(player, dealer, table.bet);
      if (payout) credit(payout);
      setTable({
        ...table,
        phase: "settled",
        shoe,
        player,
        dealer,
        outcome,
        payout,
        doubled: false,
      });
      setMessage(outcomeCopy(outcome, payout));
      return;
    }

    setTable({
      ...table,
      phase: "player",
      shoe,
      player,
      dealer,
      doubled: false,
      outcome: null,
      payout: 0,
    });
    setMessage("Hit, stand, or double.");
  };

  const finishDealer = (next: TableState) => {
    let { shoe, dealer } = next;
    const { player, bet, doubled } = next;
    while (dealerShouldHit(dealer)) {
      const drawn = draw(shoe);
      dealer = [...dealer, drawn.card];
      shoe = drawn.shoe;
    }
    const settledBet = doubled ? bet * 2 : bet;
    const { outcome, payout } = settleBlackjack(player, dealer, settledBet);
    if (payout) credit(payout);
    setTable({
      ...next,
      phase: "settled",
      shoe,
      dealer,
      outcome,
      payout,
    });
    setMessage(outcomeCopy(outcome, payout));
  };

  const hit = () => {
    if (table.phase !== "player") return;
    const drawn = draw(table.shoe);
    const player = [...table.player, drawn.card];
    const value = evaluateHand(player);
    if (value.bust) {
      setTable({
        ...table,
        phase: "settled",
        shoe: drawn.shoe,
        player,
        outcome: "bust",
        payout: 0,
      });
      setMessage(outcomeCopy("bust", 0));
      return;
    }
    setTable({ ...table, shoe: drawn.shoe, player });
  };

  const stand = () => {
    if (table.phase !== "player") return;
    finishDealer({ ...table, phase: "dealer" });
  };

  const double = () => {
    if (table.phase !== "player" || table.player.length !== 2) return;
    if (!debit(table.bet)) {
      setMessage("Doubling needs a matching stack.");
      return;
    }
    const drawn = draw(table.shoe);
    const player = [...table.player, drawn.card];
    const next = {
      ...table,
      shoe: drawn.shoe,
      player,
      doubled: true,
      phase: "dealer" as const,
    };
    if (evaluateHand(player).bust) {
      setTable({ ...next, phase: "settled", outcome: "bust", payout: 0 });
      setMessage(outcomeCopy("bust", 0));
      return;
    }
    finishDealer(next);
  };

  const nextHand = () => {
    setTable((current) => ({
      ...freshTable(),
      bet: current.bet,
    }));
    setMessage("Place a bet. Dealer stands on all 17s.");
  };

  return (
    <div className="felt-panel rounded-[36px] p-6 md:p-10">
      <div className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-gold-300">Salon Privé</p>
        <p className="font-display text-3xl text-cream">Dealer stands on 17</p>
      </div>

      <section className="mb-10">
        <p className="mb-3 text-center text-xs uppercase tracking-[0.2em] text-gold-400">
          Dealer {table.dealer.length ? (hideHole ? evaluateHand([table.dealer[0]]).total : dealerValue.total) : ""}
        </p>
        <div className="flex justify-center gap-3">
          {table.dealer.map((card, index) => (
            <PlayingCard key={`d-${index}`} card={card} hidden={hideHole && index === 1} />
          ))}
          {table.dealer.length === 0 ? <PlayingCard hidden /> : null}
        </div>
      </section>

      <div className="gold-rule mb-8 opacity-40" />

      <section className="mb-8">
        <p className="mb-3 text-center text-xs uppercase tracking-[0.2em] text-gold-400">
          You {table.player.length ? playerValue.total : ""}
          {playerValue.soft && table.phase === "player" ? " soft" : ""}
        </p>
        <div className="flex justify-center gap-3">
          {table.player.map((card, index) => (
            <PlayingCard key={`p-${index}`} card={card} />
          ))}
          {table.player.length === 0 ? (
            <>
              <PlayingCard hidden />
              <PlayingCard hidden />
            </>
          ) : null}
        </div>
      </section>

      <p className="mb-6 min-h-12 text-center text-sm text-cream">{message}</p>

      {table.phase === "betting" ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            {BJ_BETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTable((current) => ({ ...current, bet: value }))}
                className={`rounded-full px-4 py-2 text-sm ${
                  table.bet === value
                    ? "bg-gold-400 text-ink-950"
                    : "border border-gold-500/30 text-gold-200"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={deal}
            disabled={!canAfford(table.bet)}
            className="rounded-full bg-gold-400 px-10 py-3 font-display text-2xl text-ink-950 disabled:opacity-40"
          >
            Deal
          </button>
        </div>
      ) : null}

      {table.phase === "player" ? (
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={hit}
            className="rounded-full bg-cream px-6 py-2 text-ink-950"
          >
            Hit
          </button>
          <button
            type="button"
            onClick={stand}
            className="rounded-full bg-gold-400 px-6 py-2 text-ink-950"
          >
            Stand
          </button>
          <button
            type="button"
            onClick={double}
            disabled={table.player.length !== 2 || !canAfford(table.bet)}
            className="rounded-full border border-gold-500/40 px-6 py-2 text-gold-200 disabled:opacity-40"
          >
            Double
          </button>
        </div>
      ) : null}

      {table.phase === "settled" ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={nextHand}
            className="rounded-full bg-gold-400 px-10 py-3 font-display text-2xl text-ink-950"
          >
            Next hand
          </button>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-stone">
        Bet {formatChips(table.doubled ? table.bet * 2 : table.bet)} · Stack {formatChips(balance)}
      </p>
    </div>
  );
}
