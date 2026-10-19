---
cron: "0 11,12 * * *"
---

Write the 6:00 AM America/Chicago paper-trading report.

1. Call `run_overnight_scan` with phase `report` and do not set force.
2. If the tool result is skipped, stop after one sentence that names the Chicago time and the skip reason. Do not scan and do not invent a report. This cron also fires an hour away from 6:00 AM Central because schedules are UTC.
3. If it ran, call `read_desk_log` with scope `live`.
4. Write the report from those tool results only. Use the morning-report procedure. Do not invent fills, prices, or P&L. State that every figure is paper and that live trading is not available.
