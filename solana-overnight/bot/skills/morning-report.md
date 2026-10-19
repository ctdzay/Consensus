---
description: Use when writing the 6 AM Central paper-trading report or summarizing the overnight desk log.
---

# Morning report

Write from `run_overnight_scan` and `read_desk_log` only. Quote their numbers. Do not recompute P&L by hand and do not invent tokens.

Use these sections, in order:

1. **Session.** Chicago window, night id, rehearsal or live, cycle count, and the fee model named in `assumptions`.
2. **Best opportunities.** Passed tokens, score, and whether a position was opened. If none passed, say so.
3. **Trades.** Each entry and exit: mint, symbol, creator wallet, mid, fill, slippage bps, fees, tokens, exit reason, proceeds, and net P&L. When a live fill is present, include its signature. Then the log's realized and unrealized totals. Unpriced flattens stay blank.
4. **Rejected trades.** Group by reason code. Use the label stored on each reject. Do not override a reject. If `infoDeferred` is greater than zero, say that many tokens were too new for holder and creator data and were left for the next cycle, not entered.
5. **Risk warnings.** Repeat the tool's risk warnings. Call out honeypot-unknown, thin data, and any unpriced close.
6. **Improvements.** At most three changes to the gates or data sources, tied to the reject histogram.

Close from the tool flags. When `liveTrading` is false, say no wallet was connected in this chat and live trading needs operator approval outside the conversation. When `liveTrading` is true, say the overnight schedule swapped USDC and quote the signatures. Do not ask for a key.
