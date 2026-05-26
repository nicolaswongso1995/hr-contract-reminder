import nodemailer from "nodemailer";
import type { Employee } from "@/types";
import { formatDate, formatDaysRemaining } from "@/lib/utils";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildReminderHtml(employee: Employee, daysRemaining: number): string {
  const urgencyColor =
    daysRemaining <= 1 ? "#dc2626" :
    daysRemaining <= 7 ? "#ea580c" :
    daysRemaining <= 14 ? "#d97706" : "#2563eb";

  const urgencyLabel =
    daysRemaining <= 1 ? "URGENT — Expires Today/Tomorrow" :
    daysRemaining <= 7 ? "CRITICAL — Expiring This Week" :
    daysRemaining <= 14 ? "Action Required — Expiring Soon" :
    "Reminder — Contract Expiry";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Contract Expiry Reminder</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07)">
          <!-- Header -->
          <tr>
            <td style="background:${urgencyColor};padding:28px 36px">
              <p style="margin:0;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">${urgencyLabel}</p>
              <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:700">Contract Expiry Reminder</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px">
              <p style="color:#475569;font-size:15px;margin:0 0 24px">
                This is an automated reminder from the HR Contract Management System.
              </p>
              <!-- Employee Card -->
              <table width="100%" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:28px">
                <tr>
                  <td style="padding:20px 24px">
                    <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px">${employee.name}</h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:4px 0;width:45%">Employee ID</td>
                        <td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${employee.employee_id}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:4px 0">Position</td>
                        <td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${employee.position}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:4px 0">Department</td>
                        <td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${employee.department}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:4px 0">Branch</td>
                        <td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${employee.branch}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:4px 0">Contract Start</td>
                        <td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${formatDate(employee.contract_start_date)}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:4px 0">Contract End</td>
                        <td style="color:${urgencyColor};font-size:13px;font-weight:700;padding:4px 0">${formatDate(employee.contract_end_date)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Days Banner -->
              <table width="100%" style="background:${urgencyColor}15;border-radius:8px;border:1px solid ${urgencyColor}30;margin-bottom:28px">
                <tr>
                  <td style="padding:16px 24px;text-align:center">
                    <span style="color:${urgencyColor};font-size:28px;font-weight:700">${formatDaysRemaining(daysRemaining)}</span>
                  </td>
                </tr>
              </table>
              <p style="color:#475569;font-size:14px;margin:0 0 8px">
                Please take the necessary action to renew or terminate this contract before the expiry date.
              </p>
              <p style="color:#94a3b8;font-size:13px;margin:0">
                For assistance, contact the HR Department at <a href="mailto:hr@company.com" style="color:#2563eb">hr@company.com</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center">
              <p style="margin:0;color:#94a3b8;font-size:12px">
                This is an automated message from HR Contract Management System.<br>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendContractReminderEmail(
  employee: Employee,
  daysRemaining: number
): Promise<void> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== "true") {
    console.log(
      `[Email] Skipped (disabled) — ${employee.name}, ${daysRemaining}d reminder`
    );
    return;
  }

  const transport = createTransport();
  const recipients = [
    process.env.EMAIL_TO,
    employee.manager_email,
  ].filter(Boolean).join(",");

  const subject =
    daysRemaining <= 1
      ? `URGENT: ${employee.name}'s contract expires today!`
      : `Reminder: ${employee.name}'s contract expires in ${daysRemaining} days`;

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: recipients,
    subject,
    html: buildReminderHtml(employee, daysRemaining),
  });

  console.log(`[Email] Sent to ${recipients} — ${employee.name} (${daysRemaining}d)`);
}

export async function sendDailySummaryEmail(
  stats: {
    expired: number;
    critical: number;
    urgent: number;
    expiring: number;
  }
): Promise<void> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== "true") return;

  const transport = createTransport();
  const html = `
<p>Daily contract status summary:</p>
<ul>
  <li>Expired: <strong>${stats.expired}</strong></li>
  <li>Critical (≤7 days): <strong>${stats.critical}</strong></li>
  <li>Urgent (8–14 days): <strong>${stats.urgent}</strong></li>
  <li>Expiring soon (15–30 days): <strong>${stats.expiring}</strong></li>
</ul>
<p>Log in to the HR system to review and take action.</p>`;

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: `HR Daily Summary — ${new Date().toDateString()}`,
    html,
  });
}
