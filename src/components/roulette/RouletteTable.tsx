"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/Chip";
import { useBankroll } from "@/components/BankrollProvider";
import { Wheel, wheelLandingRotation } from "@/components/roulette/Wheel";
import { CHIP_VALUES, type ChipValue } from "@/lib/bankroll";
import { formatChips, formatPayout } from "@/lib/format";
import {
  addBet,
  pocketColor,
  settleRoulette,
  slipTotal,
  spinWheel,
  straightId,
  type BetId,
  type BetSlip,
} from "@/lib/roulette";

function BetMark({ amount }: { amount?: number }) {
  if (!amount) return null;
  return (
    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gold-300">
      {amount}
    </span>
  );
}

export function RouletteTable() {
  const { balance, debit, credit, canAfford } = useBankroll();
  const [chip, setChip] = useState<ChipValue>(5);
  const [slip, setSlip] = useState<BetSlip>({});
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [message, setMessage] = useState("Lay chips. Single-zero wheel. Outside bets die on 0.");
  const [lastWin, setLastWin] = useState(0);
  const [winners, setWinners] = useState<BetId[]>([]);

  const total = useMemo(() => slipTotal(slip), [slip]);

  const place = (id: BetId) => {
    if (spinning) return;
    if (!canAfford(chip) || !debit(chip)) {
      setMessage("The tray cannot cover that chip.");
      return;
    }
    setSlip((current) => addBet(current, id, chip));
    setWinners([]);
    setLastWin(0);
  };

  const clearBets = () => {
    if (spinning || total === 0) return;
    credit(total);
    setSlip({});
    setMessage("Bets returned to the tray.");
  };

  const spin = () => {
    if (spinning || total === 0) return;
    const n = spinWheel(Math.random);
    setSpinning(true);
    setResult(n);
    setWinners([]);
    setLastWin(0);
    setMessage("The wheel has the floor.");
    const target = wheelLandingRotation(n);
    setRotation((current) => {
      const currentMod = ((current % 360) + 360) % 360;
      let delta = target - currentMod;
      if (delta <= 0) delta += 360;
      return current + 360 * 5 + delta;
    });
    window.setTimeout(() => {
      const settled = settleRoulette(n, slip);
      setSpinning(false);
      setWinners(settled.winners);
      setLastWin(settled.payout);
      if (settled.payout > 0) credit(settled.payout);
      const color = pocketColor(n);
      setMessage(
        settled.payout > 0
          ? `${n} ${color}. The board pays ${formatChips(settled.payout)}.`
          : `${n} ${color}. The house keeps the layout.`,
      );
      setSlip({});
    }, 4200);
  };

  const cellClass = (id: BetId, extra = "") => {
    const active = (slip[id] ?? 0) > 0;
    const won = winners.includes(id);
    return `relative border border-cream/20 text-center ${extra} ${
      won ? "ring-2 ring-gold-400" : ""
    } ${active ? "bg-white/10" : ""}`;
  };

  const rows = [
    Array.from({ length: 12 }, (_, col) => col * 3 + 3),
    Array.from({ length: 12 }, (_, col) => col * 3 + 2),
    Array.from({ length: 12 }, (_, col) => col * 3 + 1),
  ];
  const columns: BetId[] = ["column:3", "column:2", "column:1"];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="rounded-3xl border border-gold-500/20 bg-ink-800 p-5">
        <Wheel rotation={rotation} label={spinning ? "•" : result === null ? "—" : String(result)} />
        <p className="mt-4 min-h-12 text-center text-sm text-cream">{message}</p>
        <p className="mt-2 text-center text-xs uppercase tracking-[0.2em] text-stone">
          On the layout {formatChips(total)} · Last {formatPayout(lastWin)}
          {result !== null ? ` · ${result}` : ""}
        </p>
      </div>

      <div className="rounded-[28px] border border-gold-500/25 bg-felt-900 p-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-gold-400 lg:hidden">
          Swipe the layout to reach 25–36
        </p>
        <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          <div className="mb-2 grid grid-cols-[56px_repeat(12,minmax(0,1fr))_56px] grid-rows-3 gap-1">
            <button
              type="button"
              onClick={() => place(straightId(0))}
              className={cellClass(
                straightId(0),
                "row-span-3 grid place-items-center bg-felt-800 font-sans text-2xl font-semibold text-cream",
              )}
            >
              0
              <BetMark amount={slip[straightId(0)]} />
            </button>
            {rows.flatMap((numbers, row) => [
              ...numbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => place(straightId(n))}
                  className={cellClass(
                    straightId(n),
                    `py-3 font-semibold ${
                      pocketColor(n) === "red" ? "bg-burgundy-700" : "bg-ink-950"
                    }`,
                  )}
                >
                  {n}
                  <BetMark amount={slip[straightId(n)]} />
                </button>
              )),
              <button
                key={columns[row]}
                type="button"
                onClick={() => place(columns[row])}
                className={cellClass(
                  columns[row],
                  "bg-felt-800 py-3 text-[11px] uppercase tracking-[0.12em] text-gold-200",
                )}
              >
                2:1
                <BetMark amount={slip[columns[row]]} />
              </button>,
            ])}
          </div>

          <div className="mb-2 grid grid-cols-3 gap-1">
            {(["dozen:1", "dozen:2", "dozen:3"] as const).map((id, index) => (
              <button
                key={id}
                type="button"
                onClick={() => place(id)}
                className={cellClass(
                  id,
                  "bg-felt-800 py-3 text-xs uppercase tracking-[0.16em] text-gold-200",
                )}
              >
                {index === 0 ? "1st 12" : index === 1 ? "2nd 12" : "3rd 12"}
                {slip[id] ? ` · ${slip[id]}` : ""}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-1">
            {(
              [
                ["low", "1–18"],
                ["even", "Even"],
                ["red", "Red"],
                ["black", "Black"],
                ["odd", "Odd"],
                ["high", "19–36"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => place(id)}
                className={cellClass(
                  id,
                  `py-3 text-xs uppercase tracking-[0.14em] ${
                    id === "red"
                      ? "bg-burgundy-700 text-cream"
                      : id === "black"
                        ? "bg-ink-950 text-cream"
                        : "bg-felt-800 text-gold-200"
                  }`,
                )}
              >
                {label}
                {slip[id] ? ` · ${slip[id]}` : ""}
              </button>
            ))}
          </div>
        </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {CHIP_VALUES.map((value) => (
              <Chip
                key={value}
                value={value}
                selected={chip === value}
                onClick={() => setChip(value)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearBets}
              disabled={spinning || total === 0}
              className="rounded-full border border-gold-500/30 px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold-200 disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={spin}
              disabled={spinning || total === 0}
              className="rounded-full bg-gold-400 px-6 py-2 font-display text-lg text-ink-950 disabled:opacity-40"
            >
              Spin
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone">Stack {formatChips(balance)}</p>
      </div>
    </div>
  );
}
