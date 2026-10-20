"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CHIP_VALUES } from "@/lib/bankroll";
import { formatChips } from "@/lib/format";
import { useBankroll } from "./BankrollProvider";

const NAV = [
  { href: "/", label: "Floor" },
  { href: "/slots", label: "Orchard" },
  { href: "/blackjack", label: "Salon" },
  { href: "/roulette", label: "Wheel" },
  { href: "/cashier", label: "Cashier" },
];

export function Header() {
  const pathname = usePathname();
  const { balance, ready } = useBankroll();

  return (
    <header className="sticky top-0 z-30 border-b border-gold-500/20 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-gold-500/50 bg-ink-800 text-gold-300">
            C
          </span>
          <span>
            <span className="block font-display text-lg tracking-[0.22em] text-gold-300">
              THE CONSENSUS
            </span>
            <span className="block text-[11px] uppercase tracking-[0.28em] text-stone">
              Play-money house
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${
                  active
                    ? "bg-gold-500/15 text-gold-300"
                    : "text-stone hover:text-cream"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 rounded-full border border-gold-500/30 bg-ink-800 px-3 py-1.5">
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-stone sm:block">
            Chips
          </span>
          <span className="font-display text-xl text-gold-300">
            {ready ? formatChips(balance) : "—"}
          </span>
          <span className="flex -space-x-2">
            {CHIP_VALUES.slice(0, 3).map((value) => (
              <span
                key={value}
                className="h-4 w-4 rounded-full border border-ink-950 bg-gold-500/80"
              />
            ))}
          </span>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-gold-500/10 px-4 py-2 md:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                active ? "bg-gold-500/15 text-gold-300" : "text-stone"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
