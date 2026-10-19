import { defineAgent } from "@cursor/bdk";

export default defineAgent({
  name: "Solana Overnight Desk",
  description:
    "Paper-only overnight research desk for Pump.fun tokens that have migrated to a DEX.",
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  tools: ["read", "grep", "glob", "ls"],
  local: { sandbox: true },
  hosting: {
    egressDomains: ["api.geckoterminal.com", "api.dexscreener.com"],
  },
});
