import { getAllEmployees as getTalentaEmployees } from "@/lib/talenta/client";
import { isTalentaConfigured } from "@/lib/talenta/client";
import { upsertEmployees } from "./employeeService";
import { mockEmployees } from "@/lib/mock-data";
import type { TalentaRawEmployee } from "@/lib/talenta/types";
import type { Employee } from "@/types";

function mapTalentaToEmployee(
  raw: TalentaRawEmployee
): Omit<Employee, "days_remaining" | "status"> {
  return {
    id: `tal-${raw.id}`,
    employee_id: raw.nik,
    name: `${raw.first_name} ${raw.last_name}`.trim(),
    position: raw.job_position?.name ?? "",
    department: raw.organization?.name ?? "",
    branch: raw.branch?.name ?? "",
    email: raw.email,
    phone: raw.mobile_phone,
    contract_start_date: raw.contract_start_date,
    contract_end_date: raw.contract_end_date,
    manager_email: raw.direct_manager?.email,
    talenta_id: String(raw.id),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function logSync(
  source: "talenta" | "mock",
  count: number,
  status: "success" | "failed" | "partial",
  error?: string
): Promise<void> {
  if (process.env.USE_MOCK_DATA === "true") {
    console.log(`[Sync] ${status} — ${count} employees from ${source}`);
    return;
  }
  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    await supabase.from("sync_logs").insert({
      employees_synced: count,
      status,
      error: error ?? null,
      source,
    });
  } catch (err) {
    console.error("[Sync] Failed to write sync log:", err);
  }
}

export async function syncEmployees(): Promise<{
  synced: number;
  source: "talenta" | "mock";
  status: "success" | "failed" | "partial";
  error?: string;
}> {
  const useMock = process.env.USE_MOCK_DATA === "true";

  if (useMock || !isTalentaConfigured()) {
    const count = mockEmployees.length;
    console.log(`[Sync] Using mock data (${count} employees)`);
    await logSync("mock", count, "success");
    return { synced: count, source: "mock", status: "success" };
  }

  try {
    console.log("[Sync] Fetching employees from Talenta…");
    const rawEmployees = await getTalentaEmployees();
    const mapped = rawEmployees.map(mapTalentaToEmployee);

    await upsertEmployees(mapped);
    await logSync("talenta", mapped.length, "success");

    console.log(`[Sync] Successfully synced ${mapped.length} employees from Talenta`);
    return { synced: mapped.length, source: "talenta", status: "success" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Sync] Talenta sync failed:", message);

    await logSync("talenta", 0, "failed", message);
    return {
      synced: 0,
      source: "talenta",
      status: "failed",
      error: message,
    };
  }
}

export async function getLastSyncTime(): Promise<string | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return new Date().toISOString();
  }
  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from("sync_logs")
      .select("synced_at")
      .eq("status", "success")
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();
    return data?.synced_at ?? null;
  } catch {
    return null;
  }
}
