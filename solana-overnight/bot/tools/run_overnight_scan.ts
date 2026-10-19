import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { runCycle } from "../lib/cycle.js";

export default defineTool({
  description:
    "Run one paper-only cycle on Pump.fun tokens that migrated to PumpSwap or Raydium. phase scan monitors during 10:00 PM–6:00 AM America/Chicago and may open or close simulated positions. phase report flattens the live book only at 6:00 AM Chicago. force true runs a daytime rehearsal on a separate book. There is no wallet and no live order.",
  effect: "write",
  inputSchema: z.object({
    phase: z.enum(["scan", "report"]).optional(),
    force: z.boolean().optional(),
  }),
  dryRunResult: () => ({
    ok: true,
    skipped: true,
    reason: "dry_run",
    paperTrading: true,
    liveTrading: false,
  }),
  async execute(input, ctx) {
    return runCycle(ctx.host.kv, {
      phase: input.phase,
      force: input.force,
    });
  },
});
