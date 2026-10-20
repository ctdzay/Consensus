import { formatChips } from "@/lib/format";

const CHIP_PALETTE: Record<number, { ring: string; face: string; mark: string }> = {
  5: { ring: "#d7d3c8", face: "#b9b3a6", mark: "#1b1712" },
  25: { ring: "#3f8f63", face: "#246b47", mark: "#f4ead7" },
  100: { ring: "#c23b4a", face: "#8b2433", mark: "#f4ead7" },
  500: { ring: "#3b3b48", face: "#1d1d27", mark: "#e8d5a3" },
};

export function Chip({
  value,
  selected = false,
  onClick,
  size = 56,
}: {
  value: number;
  selected?: boolean;
  onClick?: () => void;
  size?: number;
}) {
  const palette = CHIP_PALETTE[value] ?? CHIP_PALETTE[5];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${value} chip`}
      className={`relative shrink-0 rounded-full transition ${
        selected ? "scale-110 ring-2 ring-gold-400" : "hover:scale-105"
      }`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-lg">
        <circle cx="32" cy="32" r="30" fill={palette.ring} />
        <circle cx="32" cy="32" r="24" fill={palette.face} />
        <circle
          cx="32"
          cy="32"
          r="27"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeDasharray="6 5"
        />
        <text
          x="32"
          y="37"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="14"
          fill={palette.mark}
        >
          {formatChips(value)}
        </text>
      </svg>
    </button>
  );
}
