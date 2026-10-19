---
description: Use when writing the 6 AM Central paper-trading report or summarizing the overnight desk log.
---

# Morning report

Write from `run_overnight_scan` and `read_desk_log` only. Quote their numbers. Do not recompute P&L by hand and do not invent tokens.

Use these sections, in order:

1. **Session.** Chicago window, night id, rehearsal or live, cycle count, and the fee model named in `assumptions`.
2. **Best opportunities.** Passed tokens, score, and whether a paper position was opened. If none passed, say so.
3. **Simulated trades.** Each entry and exit: mint, symbol, creator wallet, mid, fill, slippage bps, fees, tokens, exit reason, proceeds, and net P&L. Then the log's realized and unrealized totals. Unpriced flattens stay blank.
4. **Rejected trades.** Group by reason code. Use the label stored on each reject. Do not override a reject.
5. **Risk warnings.** Repeat the tool's risk warnings. Call out honeypot-unknown, thin data, and any unpriced close.
6. **Improvements.** At most three changes to the gates or data sources, tied to the reject histogram.

Close by stating that no wallet was connected and live trading needs an explicit later approval. This agent cannot perform it.
