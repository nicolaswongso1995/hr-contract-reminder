/**
 * WhatsApp Notification Service — Placeholder
 *
 * This module is structured to support multiple WhatsApp providers.
 * Configure WHATSAPP_PROVIDER in .env.local:
 *
 *   fonnte   → Fonnte API (https://fonnte.com)
 *   waba     → WhatsApp Business API (Meta Cloud API)
 *   custom   → Custom webhook
 *
 * Set ENABLE_WHATSAPP_NOTIFICATIONS=true to activate.
 */

import type { Employee } from "@/types";
import { formatDate } from "@/lib/utils";

export type WhatsAppProvider = "fonnte" | "waba" | "custom";

interface SendMessagePayload {
  to: string;
  message: string;
}

async function sendViaFonnte(payload: SendMessagePayload): Promise<void> {
  const res = await fetch(process.env.WHATSAPP_API_URL!, {
    method: "POST",
    headers: {
      Authorization: process.env.WHATSAPP_API_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: payload.to,
      message: payload.message,
      countryCode: "62",
    }),
  });
  if (!res.ok) {
    throw new Error(`Fonnte API error: ${res.status} ${await res.text()}`);
  }
}

async function sendViaWABA(payload: SendMessagePayload): Promise<void> {
  // Meta WhatsApp Cloud API — requires approved message template for first contact
  // Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
  const phoneNumberId = process.env.WABA_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_API_TOKEN;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: payload.to,
        type: "text",
        text: { body: payload.message },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`WABA error: ${res.status} ${await res.text()}`);
  }
}

async function sendViaCustom(payload: SendMessagePayload): Promise<void> {
  const res = await fetch(process.env.WHATSAPP_API_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Custom WA webhook error: ${res.status}`);
  }
}

function buildReminderMessage(employee: Employee, daysRemaining: number): string {
  const urgencyTag =
    daysRemaining <= 1 ? "⚠️ URGENT" :
    daysRemaining <= 7 ? "🔴 CRITICAL" :
    daysRemaining <= 14 ? "🟠 ACTION REQUIRED" : "🔵 REMINDER";

  return [
    `${urgencyTag} — Contract Expiry Notification`,
    ``,
    `Employee: *${employee.name}*`,
    `ID: ${employee.employee_id}`,
    `Position: ${employee.position}`,
    `Branch: ${employee.branch}`,
    ``,
    `Contract ends: *${formatDate(employee.contract_end_date)}*`,
    `Days remaining: *${daysRemaining <= 0 ? "EXPIRED" : daysRemaining + " day(s)"}*`,
    ``,
    `Please take action immediately to renew or terminate this contract.`,
    `Contact HR: hr@company.com`,
  ].join("\n");
}

export async function sendContractReminderWhatsApp(
  employee: Employee,
  daysRemaining: number
): Promise<void> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS !== "true") {
    console.log(
      `[WhatsApp] Skipped (disabled) — ${employee.name}, ${daysRemaining}d reminder`
    );
    return;
  }

  if (!employee.phone) {
    console.warn(`[WhatsApp] No phone for employee ${employee.employee_id}`);
    return;
  }

  const provider = (process.env.WHATSAPP_PROVIDER ?? "fonnte") as WhatsAppProvider;
  const message = buildReminderMessage(employee, daysRemaining);
  const to = employee.phone.replace(/\D/g, "");

  switch (provider) {
    case "fonnte":
      await sendViaFonnte({ to, message });
      break;
    case "waba":
      await sendViaWABA({ to, message });
      break;
    case "custom":
      await sendViaCustom({ to, message });
      break;
    default:
      throw new Error(`Unknown WhatsApp provider: ${provider}`);
  }

  console.log(`[WhatsApp] Sent to ${to} — ${employee.name} (${daysRemaining}d)`);
}
