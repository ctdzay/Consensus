"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip } from "@/components/Chip";
import { useBankroll } from "@/components/BankrollProvider";
import { formatChips, formatPayout } from "@/lib/format";
import {
  SLOT_BETS,
  SLOT_MIN_BET,
  SLOT_PAYTABLE,
  SLOT_SYMBOLS,
  evaluateSlots,
  pickSymbol,
  playSlots,
  winningCells,
  type SlotGrid,
  type SlotSymbolId,
} from "@/lib/slots";

const SYMBOL_GLYPH: Record<SlotSymbolId, string> = {
  cherry: "CH",
  lemon: "LE",
  plum: "PL",
  grape: "GR",
  bell: "BL",
  bar: "BAR",
  seven: "7",
  diamond: "◆",
};

function emptyGrid(): SlotGrid {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => "cherry" as SlotSymbolId),
  );
}

function randomGrid(): SlotGrid {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => pickSymbol(Math.random)),
  );
}

export function SlotsTable() {
  const { balance, debit, credit, canAfford } = useBankroll();
  const [bet, setBet] = useState<number>(SLOT_MIN_BET);
  const [grid, setGrid] = useState<SlotGrid>(emptyGrid);
  const [spinning, setSpinning] = useState(false);
  const [spinningReels, setSpinningReels] = useState([false, false, false, false, false]);
  const [lastWin, setLastWin] = useState(0);
  const [message, setMessage] = useState("Three lines. Cherries are friendly. Diamonds are not shy.");
  const [highlight, setHighlight] = useState<Set<string>>(new Set());

  useEffect(() => {
    setGrid(randomGrid());
  }, []);

  const canSpin = !spinning && canAfford(bet);

  const spin = () => {
    if (!canSpin) return;
    if (!debit(bet)) {
      setMessage("The tray is light. Visit the cashier for another stack.");
      return;
    }
    setSpinning(true);
    setHighlight(new Set());
    setLastWin(0);
    setMessage("Reels in motion.");
    setSpinningReels([true, true, true, true, true]);

    const result = playSlots(Math.random, bet);
    const delays = [450, 700, 950, 1200, 1450];

    delays.forEach((delay, reel) => {
      window.setTimeout(() => {
        setGrid((current) => {
          const next = current.map((col) => [...col]);
          next[reel] = result.grid[reel];
          return next;
        });
        setSpinningReels((current) => {
          const next = [...current];
          next[reel] = false;
          return next;
        });
        if (reel === delays.length - 1) {
          const evaluated = evaluateSlots(result.grid, bet);
          setHighlight(winningCells(evaluated));
          setLastWin(evaluated.totalWin);
          if (evaluated.totalWin > 0) {
            credit(evaluated.totalWin);
            setMessage(
              evaluated.lineWins
                .map((win) => `Line ${win.line + 1}: ${win.count} ${win.symbol}s pay ${win.payout}`)
                .join(" · "),
            );
          } else {
            setMessage("The orchard is quiet. Another coin?");
          }
          setSpinning(false);
        }
      }, delay);
    });
  };

  useEffect(() => {
    if (!spinningReels.some(Boolean)) return;
    const id = window.setInterval(() => {
      setGrid((current) =>
        current.map((col, reel) => (spinningReels[reel] ? col.map(() => pickSymbol(Math.random)) : col)),
      );
    }, 70);
    return () => window.clearInterval(id);
  }, [spinningReels]);

  const paytablePreview = useMemo(
    () => SLOT_SYMBOLS.slice().reverse(),
    [],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
      <div className="felt-panel rounded-[32px] p-6 md:p-8">
        <div className="mb-5 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-gold-300">
          <span>Night Orchard</span>
          <span>3 paylines · min {SLOT_MIN_BET}</span>
        </div>
        <div className="grid grid-cols-5 gap-2 rounded-2xl border border-gold-500/25 bg-ink-950/50 p-3">
          {grid.map((reel, reelIndex) => (
            <div
              key={reelIndex}
              className={`grid gap-2 rounded-xl bg-ink-900 p-2 ${
                spinningReels[reelIndex] ? "reel-spinning" : ""
              }`}
            >
              {reel.map((symbol, row) => {
                const meta = SLOT_SYMBOLS.find((item) => item.id === symbol)!;
                const lit = highlight.has(`${reelIndex}:${row}`);
                return (
                  <div
                    key={`${reelIndex}-${row}`}
                    className={`grid h-16 place-items-center rounded-lg border font-display text-lg font-semibold tracking-wide md:h-20 md:text-xl ${
                      lit
                        ? "border-gold-400 bg-gold-500/20 shadow-gold"
                        : "border-white/5 bg-ink-800"
                    }`}
                    style={{ color: meta.color }}
                    title={meta.label}
                  >
                    {SYMBOL_GLYPH[symbol]}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-4 min-h-12 text-sm text-cream/90">{message}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-gold-400">Stake</p>
            <div className="flex flex-wrap gap-2">
              {SLOT_BETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBet(value)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    bet === value
                      ? "bg-gold-500 text-ink-950"
                      : "border border-gold-500/30 text-gold-200"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={spin}
            disabled={!canSpin}
            className="rounded-full bg-gold-400 px-8 py-3 font-display text-xl text-ink-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Spin
          </button>
        </div>
        <div className="mt-4 flex justify-between text-sm text-stone">
          <span>Stack {formatChips(balance)}</span>
          <span>Last win {formatPayout(lastWin)}</span>
        </div>
      </div>
      <aside className="rounded-3xl border border-gold-500/20 bg-ink-800 p-5">
        <h2 className="font-display text-2xl text-gold-300">Paytable</h2>
        <p className="mt-1 text-xs text-stone">Left-to-right on each line. Bet splits across three lines.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {paytablePreview.map((symbol) => (
            <li key={symbol.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span style={{ color: symbol.color }}>{SYMBOL_GLYPH[symbol.id]}</span>
                <span className="capitalize text-cream">{symbol.label}</span>
              </span>
              <span className="text-stone">
                {SLOT_PAYTABLE[symbol.id][3]}/{SLOT_PAYTABLE[symbol.id][4]}/
                {SLOT_PAYTABLE[symbol.id][5]}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-5 text-stone">
          Three / four / five of a kind pay 5–5000× the line stake. Diamonds sit at the top of that ladder.
        </p>
        <div className="mt-6 flex gap-2">
          <Chip value={5} />
          <Chip value={25} />
          <Chip value={100} />
        </div>
      </aside>
    </div>
  );
}
