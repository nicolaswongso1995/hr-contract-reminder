import { NextRequest, NextResponse } from "next/server";
import { runDailyReminderCheck } from "@/services/notificationService";
import { syncEmployees } from "@/services/syncService";

/**
 * POST /api/cron
 *
 * Triggered by external schedulers (Vercel Cron, GitHub Actions, etc.).
 * Protected by CRON_SECRET header.
 *
 * Vercel cron.json example:
 * {
 *   "crons": [
 *     { "path": "/api/cron", "schedule": "0 8 * * *" }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ??
                 request.headers.get("authorization")?.replace("Bearer ", "");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const [syncResult, reminderResult] = await Promise.all([
      syncEmployees(),
      runDailyReminderCheck(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sync: syncResult,
        reminders: reminderResult,
        ran_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: `Cron job failed: ${message}` },
      { status: 500 }
    );
  }
}

// Vercel Cron Jobs use GET
export async function GET(request: NextRequest) {
  return POST(request);
}
