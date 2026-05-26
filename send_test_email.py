#!/usr/bin/env python3
"""
One-shot script: send a 30-day contract expiry summary email.
Usage: python3 send_test_email.py
"""

import smtplib
import sys
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ── Config ────────────────────────────────────────────────────
SMTP_HOST   = "smtp.gmail.com"
SMTP_PORT   = 587
SENDER      = "wongso.nicolas75@gmail.com"
APP_PASSWORD = ""          # <-- paste your 16-char App Password here, or pass as argv[1]
RECIPIENT   = "nicolas@thomasong.co.id"
TODAY       = date.today()

# ── Employees expiring within 30 days (from mock data) ────────
EXPIRING = [
    {"name": "Siti Nurhaliza Putri",  "id": "EMP-002", "position": "HR Business Partner",            "branch": "Jakarta HQ", "end": "2026-05-26", "days": 1,  "status": "Critical"},
    {"name": "Budi Santoso Wibowo",   "id": "EMP-003", "position": "Financial Analyst",              "branch": "Surabaya",   "end": "2026-05-29", "days": 4,  "status": "Critical"},
    {"name": "Dewi Rahayu Kusuma",    "id": "EMP-004", "position": "Marketing Manager",              "branch": "Bandung",    "end": "2026-06-04", "days": 10, "status": "Urgent"},
    {"name": "Reza Firmansyah",       "id": "EMP-005", "position": "Operations Supervisor",          "branch": "Surabaya",   "end": "2026-06-08", "days": 14, "status": "Urgent"},
    {"name": "Nurul Hidayah Sari",    "id": "EMP-006", "position": "Accounting Staff",               "branch": "Jakarta HQ", "end": "2026-06-15", "days": 21, "status": "Expiring Soon"},
    {"name": "Fajar Prasetyo",        "id": "EMP-007", "position": "Product Designer",               "branch": "Jakarta HQ", "end": "2026-06-20", "days": 26, "status": "Expiring Soon"},
]

# ── Status colour map ─────────────────────────────────────────
STATUS_COLOR = {
    "Critical":     "#dc2626",
    "Urgent":       "#ea580c",
    "Expiring Soon":"#d97706",
}
STATUS_BG = {
    "Critical":     "#fee2e2",
    "Urgent":       "#ffedd5",
    "Expiring Soon":"#fef3c7",
}

def fmt_date(s):
    y, m, d = s.split("-")
    months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    return f"{int(d)} {months[int(m)]} {y}"

def fmt_days(d):
    if d == 1: return "1 day left"
    return f"{d} days left"

# ── Build HTML ────────────────────────────────────────────────
def build_rows():
    rows = ""
    for e in EXPIRING:
        color = STATUS_COLOR.get(e["status"], "#475569")
        bg    = STATUS_BG.get(e["status"], "#f8fafc")
        rows += f"""
        <tr style="border-top:1px solid #f1f5f9">
          <td style="padding:14px 16px">
            <div style="font-weight:600;color:#0f172a;font-size:14px">{e["name"]}</div>
            <div style="color:#94a3b8;font-size:12px;margin-top:2px">{e["id"]} &middot; {e["position"]}</div>
            <div style="color:#94a3b8;font-size:12px">{e["branch"]}</div>
          </td>
          <td style="padding:14px 16px;white-space:nowrap">
            <span style="font-weight:700;color:{color};font-size:14px">{fmt_days(e["days"])}</span>
          </td>
          <td style="padding:14px 16px;white-space:nowrap;color:#475569;font-size:13px">{fmt_date(e["end"])}</td>
          <td style="padding:14px 16px">
            <span style="display:inline-block;padding:3px 10px;border-radius:99px;background:{bg};color:{color};font-size:11px;font-weight:700">{e["status"]}</span>
          </td>
        </tr>"""
    return rows

critical_count  = sum(1 for e in EXPIRING if e["status"] == "Critical")
urgent_count    = sum(1 for e in EXPIRING if e["status"] == "Urgent")
expiring_count  = sum(1 for e in EXPIRING if e["status"] == "Expiring Soon")

HTML = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px 36px">
      <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:10px;padding:8px 14px;margin-bottom:16px">
        <span style="color:#fff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em">Contract Expiry Report</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;line-height:1.2">
        {len(EXPIRING)} Contracts Expiring<br>Within 30 Days
      </h1>
      <p style="margin:10px 0 0;color:#93c5fd;font-size:14px">
        Generated {TODAY.strftime("%-d %B %Y")} &mdash; HR Contract Management System
      </p>
    </td>
  </tr>

  <!-- Summary pills -->
  <tr>
    <td style="padding:24px 36px 8px">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:10px">
            <div style="background:#fee2e2;border-radius:10px;padding:12px 18px;text-align:center">
              <div style="font-size:26px;font-weight:800;color:#dc2626">{critical_count}</div>
              <div style="font-size:11px;font-weight:600;color:#991b1b;text-transform:uppercase;letter-spacing:.05em">Critical</div>
            </div>
          </td>
          <td style="padding-right:10px">
            <div style="background:#ffedd5;border-radius:10px;padding:12px 18px;text-align:center">
              <div style="font-size:26px;font-weight:800;color:#ea580c">{urgent_count}</div>
              <div style="font-size:11px;font-weight:600;color:#9a3412;text-transform:uppercase;letter-spacing:.05em">Urgent</div>
            </div>
          </td>
          <td>
            <div style="background:#fef3c7;border-radius:10px;padding:12px 18px;text-align:center">
              <div style="font-size:26px;font-weight:800;color:#d97706">{expiring_count}</div>
              <div style="font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:.05em">Expiring Soon</div>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Table -->
  <tr>
    <td style="padding:20px 36px 8px">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Employee Details</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Employee</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Days Left</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Expires On</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Status</th>
          </tr>
        </thead>
        <tbody>
          {build_rows()}
        </tbody>
      </table>
    </td>
  </tr>

  <!-- Action note -->
  <tr>
    <td style="padding:20px 36px 8px">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px">
        <p style="margin:0;font-size:14px;font-weight:600;color:#1e40af">Action Required</p>
        <p style="margin:6px 0 0;font-size:13px;color:#3b82f6">
          Please review the contracts above and coordinate with department managers to initiate renewal or termination procedures before the expiry date.
        </p>
      </div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 36px;border-top:1px solid #f1f5f9;margin-top:16px">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
        This is an automated test email from HR Contract Management System.<br>
        Sent to {RECIPIENT} &mdash; {TODAY.strftime("%-d %B %Y")}
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>
"""

PLAIN = f"""HR CONTRACT EXPIRY SUMMARY — {TODAY.strftime('%-d %B %Y')}

{len(EXPIRING)} contracts expiring within 30 days:

{'─'*55}
{'Employee':<30} {'Days Left':<12} {'Expires'}
{'─'*55}
""" + "\n".join(
    f"{e['name']:<30} {fmt_days(e['days']):<12} {fmt_date(e['end'])}"
    for e in EXPIRING
) + f"""
{'─'*55}

Critical  : {critical_count} employees (≤ 7 days)
Urgent    : {urgent_count} employees (8–14 days)
Expiring  : {expiring_count} employees (15–30 days)

Please take action before the contracts expire.

— HR Contract Management System
"""

# ── Send ──────────────────────────────────────────────────────
def send(app_password: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[HR] {len(EXPIRING)} Contracts Expiring Within 30 Days — {TODAY.strftime('%-d %b %Y')}"
    msg["From"]    = f"HR Contract System <{SENDER}>"
    msg["To"]      = RECIPIENT
    msg.attach(MIMEText(PLAIN, "plain"))
    msg.attach(MIMEText(HTML,  "html"))

    print(f"Connecting to {SMTP_HOST}:{SMTP_PORT} …")
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.ehlo()
        s.starttls()
        s.login(SENDER, app_password)
        s.sendmail(SENDER, RECIPIENT, msg.as_string())
    print(f"Email sent to {RECIPIENT}")

if __name__ == "__main__":
    pw = sys.argv[1] if len(sys.argv) > 1 else APP_PASSWORD
    if not pw:
        print("Error: provide your Gmail App Password as argument or set APP_PASSWORD in this script.")
        print("  python3 send_test_email.py 'xxxx xxxx xxxx xxxx'")
        sys.exit(1)
    send(pw)
