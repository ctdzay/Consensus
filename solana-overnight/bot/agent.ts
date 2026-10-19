import { defineAgent } from "@cursor/bdk";

export default defineAgent({
  name: "Solana Overnight Desk",
  description:
    "Overnight desk for migrated Pump.fun tokens. The schedule paper-trades by default and swaps USDC only when the operator arms live trading.",
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
    egressDomains: [
      "api.geckoterminal.com",
      "api.dexscreener.com",
      "api.jup.ag",
      "api.mainnet-beta.solana.com",
    ],
  },
});
