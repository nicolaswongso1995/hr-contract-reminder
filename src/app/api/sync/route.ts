import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { syncEmployees, getLastSyncTime } from "@/services/syncService";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await syncEmployees();
  return NextResponse.json({
    success: result.status !== "failed",
    data: result,
    message: result.status === "success"
      ? `Synced ${result.synced} employees from ${result.source}`
      : `Sync failed: ${result.error}`,
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const lastSync = await getLastSyncTime();
  return NextResponse.json({ success: true, data: { last_sync: lastSync } });
}
