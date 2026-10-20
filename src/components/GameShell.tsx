import type { ReactNode } from "react";
import Link from "next/link";

export function GameShell({
  eyebrow,
  title,
  rules,
  children,
}: {
  eyebrow: string;
  title: string;
  rules: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold-400">{eyebrow}</p>
          <h1 className="font-display text-4xl text-cream md:text-5xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone">{rules}</p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-gold-500/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-gold-300 hover:bg-gold-500/10"
        >
          Back to floor
        </Link>
      </div>
      {children}
    </div>
  );
}
