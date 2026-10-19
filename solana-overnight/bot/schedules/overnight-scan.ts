import { defineSchedule } from "@cursor/bdk/schedules";

// Cron is UTC. 03:00–11:30 UTC covers 10:00 PM–6:00 AM America/Chicago
// in both CST and CDT. The tool no-ops outside that local window.
export default defineSchedule({
  cron: "*/30 3-11 * * *",
  async run({ callTool }) {
    await callTool("run_overnight_scan", { phase: "scan" });
  },
});
