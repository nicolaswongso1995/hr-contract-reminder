import { getAllEmployees } from "./employeeService";
import { sendContractReminderEmail } from "./emailService";
import { sendContractReminderWhatsApp } from "./whatsappService";
import type { Employee, ReminderConfig } from "@/types";

const DEFAULT_REMINDER_CONFIGS: ReminderConfig[] = [
  { days: 30, enabled: true,  email: true,  whatsapp: false },
  { days: 14, enabled: true,  email: true,  whatsapp: false },
  { days: 7,  enabled: true,  email: true,  whatsapp: true  },
  { days: 1,  enabled: true,  email: true,  whatsapp: true  },
];

async function getReminderConfigs(): Promise<ReminderConfig[]> {
  if (process.env.USE_MOCK_DATA === "true") return DEFAULT_REMINDER_CONFIGS;

  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "reminder_configs")
      .single();
    return (data?.value as ReminderConfig[]) ?? DEFAULT_REMINDER_CONFIGS;
  } catch {
    return DEFAULT_REMINDER_CONFIGS;
  }
}

async function wasNotificationSentToday(
  employeeId: string,
  reminderDays: number
): Promise<boolean> {
  if (process.env.USE_MOCK_DATA === "true") return false;

  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    const today = new Date().toISOString().slice(0, 10);

    const { count } = await supabase
      .from("notification_logs")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employeeId)
      .eq("reminder_days", reminderDays)
      .gte("sent_at", `${today}T00:00:00Z`);

    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

async function logNotification(
  employee: Employee,
  reminderDays: number,
  type: "email" | "whatsapp",
  status: "sent" | "failed",
  error?: string
): Promise<void> {
  if (process.env.USE_MOCK_DATA === "true") {
    console.log(`[Log] ${status} — ${type} for ${employee.name} (${reminderDays}d)`);
    return;
  }

  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    await supabase.from("notification_logs").insert({
      employee_id: employee.id,
      employee_name: employee.name,
      notification_type: type,
      reminder_days: reminderDays,
      status,
      error: error ?? null,
    });
  } catch (err) {
    console.error("[Log] Failed to save notification log:", err);
  }
}

export async function processRemindersForEmployee(
  employee: Employee,
  configs: ReminderConfig[]
): Promise<void> {
  for (const config of configs) {
    if (!config.enabled) continue;
    if (employee.days_remaining !== config.days) continue;

    const alreadySent = await wasNotificationSentToday(employee.id, config.days);
    if (alreadySent) {
      console.log(`[Reminder] Already sent today for ${employee.name} (${config.days}d)`);
      continue;
    }

    if (config.email) {
      try {
        await sendContractReminderEmail(employee, config.days);
        await logNotification(employee, config.days, "email", "sent");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Email] Failed for ${employee.name}:`, msg);
        await logNotification(employee, config.days, "email", "failed", msg);
      }
    }

    if (config.whatsapp) {
      try {
        await sendContractReminderWhatsApp(employee, config.days);
        await logNotification(employee, config.days, "whatsapp", "sent");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[WhatsApp] Failed for ${employee.name}:`, msg);
        await logNotification(employee, config.days, "whatsapp", "failed", msg);
      }
    }
  }
}

export async function runDailyReminderCheck(): Promise<{
  checked: number;
  notified: number;
}> {
  console.log("[Reminder] Starting daily contract check…");
  const [employees, configs] = await Promise.all([
    getAllEmployees(),
    getReminderConfigs(),
  ]);

  const reminderDays = configs.map((c) => c.days);
  const toRemind = employees.filter((e) =>
    reminderDays.includes(e.days_remaining as never) && e.status !== "active" && e.status !== "recently_renewed"
  );

  console.log(`[Reminder] ${employees.length} employees, ${toRemind.length} need reminders`);

  for (const employee of toRemind) {
    await processRemindersForEmployee(employee, configs);
  }

  console.log("[Reminder] Daily check complete");
  return { checked: employees.length, notified: toRemind.length };
}
