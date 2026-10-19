import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { readDesk } from "../lib/cycle.js";
import { rejectCounts, summarizePnl, type Book } from "../lib/engine.js";

export default defineTool({
  description:
    "Read the paper trade log: open simulated positions, closed fills with net P&L, reject reasons, and the fee model. scope live is the overnight book. scope rehearsal is the forced daytime book. Does not trade.",
  effect: "read",
  inputSchema: z.object({
    scope: z.enum(["live", "rehearsal"]).optional(),
  }),
  async execute(input, ctx) {
    const scope = input.scope ?? "live";
    const { book, nightId } = await readDesk(ctx.host.kv, scope);
    if (!book) {
      return {
        ok: true,
        paperTrading: true,
        liveTrading: false,
        scope,
        nightId,
        empty: true,
      };
    }
    return viewBook(book, scope);
  },
});

function viewBook(book: Book, scope: "live" | "rehearsal") {
  const pnl = summarizePnl(book);
  const liveTrading = book.assumptions.liveTrading === true;
  return {
    ok: true,
    paperTrading: !liveTrading,
    liveTrading,
    scope,
    empty: false,
    nightId: book.nightId,
    rehearsal: book.rehearsal,
    cycles: book.cycles,
    updatedAt: book.updatedAt,
    assumptions: book.assumptions,
    realizedPnlUsd: pnl.realizedPnlUsd,
    unrealizedPnlUsd: pnl.unrealizedPnlUsd,
    pricedCloses: pnl.pricedCloses,
    unpricedCloses: pnl.unpricedCloses,
    openCount: book.open.length,
    rejectCounts: rejectCounts(book),
    open: book.open,
    closed: book.closed.slice(-30),
    rejects: book.rejects.slice(-40),
    events: book.events.slice(-40),
  };
}
