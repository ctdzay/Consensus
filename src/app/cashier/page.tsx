"use client";

import Link from "next/link";
import { Chip } from "@/components/Chip";
import { useBankroll } from "@/components/BankrollProvider";
import { REFILL_AMOUNT, STARTING_BANKROLL } from "@/lib/bankroll";
import { formatChips } from "@/lib/format";

export default function CashierPage() {
  const { balance, refill, ready } = useBankroll();

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.32em] text-gold-400">Cashier window</p>
      <h1 className="mt-3 font-display text-5xl text-cream">Another stack</h1>
      <p className="mt-4 text-stone">
        These chips have no cash value. A refill adds {formatChips(REFILL_AMOUNT)} play
        chips to whatever is already on the tray. Members begin with{" "}
        {formatChips(STARTING_BANKROLL)}.
      </p>
      <p className="mt-8 font-display text-6xl text-gold-300">
        {ready ? formatChips(balance) : "—"}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Chip value={25} />
        <Chip value={100} />
        <Chip value={500} />
      </div>
      <button
        type="button"
        onClick={refill}
        className="mt-10 rounded-full bg-gold-400 px-8 py-3 font-display text-2xl text-ink-950"
      >
        Take {formatChips(REFILL_AMOUNT)} chips
      </button>
      <p className="mt-8">
        <Link href="/" className="text-xs uppercase tracking-[0.2em] text-gold-400">
          Return to the floor
        </Link>
      </p>
    </div>
  );
}
