import { GameShell } from "@/components/GameShell";
import { SlotsTable } from "@/components/slots/SlotsTable";

export default function SlotsPage() {
  return (
    <GameShell
      eyebrow="Slots"
      title="Night Orchard"
      rules="Five reels, three horizontal lines, left-to-right only. Your stake is split evenly across the lines. Diamonds are scarce on purpose."
    >
      <SlotsTable />
    </GameShell>
  );
}
