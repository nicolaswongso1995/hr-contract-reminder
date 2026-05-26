#!/usr/bin/env tsx
/**
 * Contract Checker — Standalone Cron Job
 *
 * Run directly:  npx tsx src/jobs/contractChecker.ts
 * Schedule:      node-cron handles daily execution internally
 *
 * Alternatively, trigger via API endpoint /api/cron (with CRON_SECRET header)
 * from Vercel Cron Jobs, GitHub Actions, or an external scheduler.
 */

import cron from "node-cron";
import { runDailyReminderCheck } from "@/services/notificationService";
import { syncEmployees } from "@/services/syncService";

const SCHEDULE = process.env.CRON_SCHEDULE ?? "0 8 * * *"; // 08:00 daily

async function runJob(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`\n${"─".repeat(60)}`);
  console.log(`[Job] Contract checker started at ${startedAt}`);
  console.log(`${"─".repeat(60)}`);

  try {
    // 1. Sync employees from Talenta
    console.log("[Job] Step 1/2 — Syncing employees…");
    const syncResult = await syncEmployees();
    console.log(
      `[Job] Sync complete: ${syncResult.synced} employees from ${syncResult.source}`
    );

    // 2. Run reminder notifications
    console.log("[Job] Step 2/2 — Processing reminders…");
    const reminderResult = await runDailyReminderCheck();
    console.log(
      `[Job] Reminders: checked ${reminderResult.checked}, notified ${reminderResult.notified}`
    );

    console.log(`[Job] ✓ Completed successfully at ${new Date().toISOString()}`);
  } catch (err) {
    console.error("[Job] ✗ Fatal error:", err);
    process.exit(1);
  }
}

// When run directly (not imported), execute once then schedule
const isDirectRun = require.main === module ||
  process.argv[1]?.includes("contractChecker");

if (isDirectRun) {
  console.log(`[Scheduler] Starting with schedule: ${SCHEDULE}`);

  // Run immediately on startup
  runJob().then(() => {
    // Then schedule recurring execution
    cron.schedule(SCHEDULE, runJob, {
      scheduled: true,
      timezone: "Asia/Jakarta",
    });
    console.log(`[Scheduler] Cron job scheduled (${SCHEDULE}, Asia/Jakarta)`);
  });
}

export { runJob };
