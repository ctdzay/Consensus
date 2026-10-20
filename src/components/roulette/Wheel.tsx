"use client";

import { WHEEL_ORDER, pocketColor } from "@/lib/roulette";

const ANGLE = 360 / WHEEL_ORDER.length;

export function wheelLandingRotation(n: number): number {
  const index = WHEEL_ORDER.indexOf(n as (typeof WHEEL_ORDER)[number]);
  return (360 - (index * ANGLE + ANGLE / 2) + 360) % 360;
}

export function Wheel({
  rotation,
  label,
}: {
  rotation: number;
  label: string;
}) {
  const gradient = WHEEL_ORDER.map((n, i) => {
    const color =
      pocketColor(n) === "green" ? "#14533c" : pocketColor(n) === "red" ? "#8b2433" : "#161310";
    const start = (i * ANGLE).toFixed(3);
    const end = ((i + 1) * ANGLE).toFixed(3);
    return `${color} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <div className="relative mx-auto h-72 w-72">
      <div className="absolute left-1/2 top-0 z-10 h-6 w-3 -translate-x-1/2 rounded-b bg-gold-300" />
      <div
        className="wheel-spin absolute inset-0 rounded-full border-[10px] border-gold-500 shadow-gold"
        style={{
          background: `conic-gradient(from -90deg, ${gradient})`,
          transform: `rotate(${rotation}deg)`,
          transition: "transform 4.2s cubic-bezier(0.12, 0.7, 0.12, 1)",
        }}
      >
        <div className="absolute inset-[22%] rounded-full bg-ink-900" />
        <div className="absolute inset-[38%] grid place-items-center rounded-full border border-gold-500/40 bg-ink-800 font-display text-2xl text-gold-300">
          {label}
        </div>
      </div>
    </div>
  );
}
