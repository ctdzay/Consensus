import { GameShell } from "@/components/GameShell";
import { RouletteTable } from "@/components/roulette/RouletteTable";

export default function RoulettePage() {
  return (
    <GameShell
      eyebrow="Roulette"
      title="Single Zero"
      rules="European wheel, 37 pockets. Straight-up pays 35:1, even-money 1:1, dozens and columns 2:1. Zero is green and beats every outside bet."
    >
      <RouletteTable />
    </GameShell>
  );
}
