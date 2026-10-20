import { GameShell } from "@/components/GameShell";
import { BlackjackTable } from "@/components/blackjack/BlackjackTable";

export default function BlackjackPage() {
  return (
    <GameShell
      eyebrow="Blackjack"
      title="Salon Privé"
      rules="One deck shuffled each hand. Blackjack pays 3:2. Dealer peeks on ace or ten and stands on all 17s, including soft. Double on any two cards. No splits, no insurance."
    >
      <BlackjackTable />
    </GameShell>
  );
}
