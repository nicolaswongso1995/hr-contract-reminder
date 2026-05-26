#!/usr/bin/env python3
"""
HR Weekly Contract Expiry Report
=================================
Run manually:   python3 hris/weekly_report.py
Via cron:       0 1 * * 1  /bin/bash .../run_weekly.sh

What it does:
  1. Pulls all employees from Mekari Talenta API
     (falls back to employees.json cache if API is unavailable)
  2. Saves fresh data to employees.json (read by the dashboard)
  3. Sends a beautiful HTML summary email every Monday
"""

import json
import os
import smtplib
import sys
import urllib.error
from datetime import date, datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────
ROOT        = Path(__file__).parent.parent
ENV_FILE    = Path(__file__).parent / ".env"
CACHE_FILE  = ROOT / "employees.json"

# ── Mock fallback (used when Talenta creds not yet configured) ─
MOCK_EMPLOYEES_RAW = [
    {"employee_id":"EMP-001","name":"Ahmad Rizky Fadillah",  "position":"Senior Software Engineer",      "department":"Technology",        "branch":"Jakarta HQ","email":"ahmad.rizky@company.com",   "phone":"+62812-3456-7890","contract_start_date":"2022-06-01","contract_end_date":"2024-05-31","manager_email":"cto@company.com"},
    {"employee_id":"EMP-002","name":"Siti Nurhaliza Putri",   "position":"HR Business Partner",           "department":"Human Resources",   "branch":"Jakarta HQ","email":"siti.nurhaliza@company.com", "phone":"+62813-2345-6789","contract_start_date":"2023-06-01","contract_end_date":"2026-05-26","manager_email":"hrd@company.com"},
    {"employee_id":"EMP-003","name":"Budi Santoso Wibowo",    "position":"Financial Analyst",             "department":"Finance",           "branch":"Surabaya",  "email":"budi.santoso@company.com",  "phone":"+62821-3456-7890","contract_start_date":"2024-06-01","contract_end_date":"2026-05-29","manager_email":"cfo@company.com"},
    {"employee_id":"EMP-004","name":"Dewi Rahayu Kusuma",     "position":"Marketing Manager",             "department":"Marketing",         "branch":"Bandung",   "email":"dewi.rahayu@company.com",   "phone":"+62817-3456-7890","contract_start_date":"2023-01-01","contract_end_date":"2026-06-04","manager_email":"cmo@company.com"},
    {"employee_id":"EMP-005","name":"Reza Firmansyah",        "position":"Operations Supervisor",        "department":"Operations",        "branch":"Surabaya",  "email":"reza.firmansyah@company.com","phone":"+62815-2345-6789","contract_start_date":"2023-06-15","contract_end_date":"2026-06-08","manager_email":"coo@company.com"},
    {"employee_id":"EMP-006","name":"Nurul Hidayah Sari",     "position":"Accounting Staff",              "department":"Finance",           "branch":"Jakarta HQ","email":"nurul.hidayah@company.com", "phone":"+62816-3456-7890","contract_start_date":"2024-06-15","contract_end_date":"2026-06-15","manager_email":"cfo@company.com"},
    {"employee_id":"EMP-007","name":"Fajar Prasetyo",         "position":"Product Designer",              "department":"Technology",        "branch":"Jakarta HQ","email":"fajar.prasetyo@company.com","phone":"+62818-2345-6789","contract_start_date":"2024-07-01","contract_end_date":"2026-06-20","manager_email":"cto@company.com"},
    {"employee_id":"EMP-008","name":"Indah Permatasari",      "position":"Customer Service Lead",        "department":"Customer Experience","branch":"Bandung",  "email":"indah.permata@company.com", "phone":"+62819-3456-7890","contract_start_date":"2023-08-01","contract_end_date":"2026-07-31","manager_email":"cceo@company.com"},
    {"employee_id":"EMP-009","name":"Hendra Gunawan",         "position":"Supply Chain Analyst",         "department":"Operations",        "branch":"Medan",     "email":"hendra.gunawan@company.com","phone":"+62820-2345-6789","contract_start_date":"2024-09-01","contract_end_date":"2026-08-31","manager_email":"coo@company.com"},
    {"employee_id":"EMP-010","name":"Rina Wulandari",         "position":"Sales Executive",              "department":"Sales",             "branch":"Medan",     "email":"rina.wulandari@company.com","phone":"+62811-3456-7890","contract_start_date":"2024-01-01","contract_end_date":"2026-12-31","manager_email":"csoo@company.com"},
    {"employee_id":"EMP-011","name":"Taufik Hidayat",         "position":"IT Infrastructure Engineer",   "department":"Technology",        "branch":"Surabaya",  "email":"taufik.hidayat@company.com","phone":"+62812-9876-5432","contract_start_date":"2026-05-01","contract_end_date":"2028-04-30","manager_email":"cto@company.com"},
    {"employee_id":"EMP-012","name":"Maya Anggraini",         "position":"Legal Counsel",                "department":"Legal",             "branch":"Jakarta HQ","email":"maya.anggraini@company.com","phone":"+62813-9876-5432","contract_start_date":"2026-04-15","contract_end_date":"2028-04-14","manager_email":"clo@company.com"},
    {"employee_id":"EMP-013","name":"Agus Setiawan",          "position":"Warehouse Manager",            "department":"Operations",        "branch":"Bandung",   "email":"agus.setiawan@company.com", "phone":"+62821-9876-5432","contract_start_date":"2024-02-01","contract_end_date":"2025-12-31","manager_email":"coo@company.com"},
    {"employee_id":"EMP-014","name":"Lestari Wibawati",       "position":"Digital Marketing Specialist", "department":"Marketing",         "branch":"Jakarta HQ","email":"lestari.wibawati@company.com","phone":"+62817-9876-5432","contract_start_date":"2025-03-01","contract_end_date":"2027-02-28","manager_email":"cmo@company.com"},
    {"employee_id":"EMP-015","name":"Bayu Pratama",           "position":"Business Development Manager","department":"Sales",             "branch":"Medan",     "email":"bayu.pratama@company.com",  "phone":"+62818-9876-5432","contract_start_date":"2026-05-10","contract_end_date":"2028-05-09","manager_email":"csoo@company.com"},
]

# ── Config loader ─────────────────────────────────────────────

def load_env(path: Path) -> dict:
    cfg = {}
    if not path.exists():
        return cfg
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        cfg[key.strip()] = val.strip().strip('"').strip("'")
    return cfg

# ── Date helpers ──────────────────────────────────────────────

TODAY = date.today()

def days_remaining(end_str: str) -> int:
    try:
        end = date.fromisoformat(end_str)
        return (end - TODAY).days
    except Exception:
        return 9999

def status_of(end_str: str, start_str: str) -> str:
    d = days_remaining(end_str)
    try:
        start = date.fromisoformat(start_str)
        days_since_start = (TODAY - start).days
    except Exception:
        days_since_start = 999
    if d < 0:   return "expired"
    if d <= 7:  return "critical"
    if d <= 14: return "urgent"
    if d <= 30: return "expiring"
    if days_since_start <= 30: return "recently_renewed"
    return "active"

def fmt_date(s: str) -> str:
    try:
        d = date.fromisoformat(s)
        return d.strftime("%-d %b %Y")
    except Exception:
        return s

def fmt_days(d: int) -> str:
    if d < 0:  return f"{abs(d)} days overdue"
    if d == 0: return "Expires today"
    if d == 1: return "1 day left"
    return f"{d} days left"

# ── Talenta sync ──────────────────────────────────────────────

def sync_from_talenta(cfg: dict) -> tuple[list[dict], str]:
    """
    Try to fetch from Talenta. Returns (employees, source).
    Falls back to cache then mock data on any failure.
    """
    client_id     = cfg.get("TALENTA_CLIENT_ID", "")
    client_secret = cfg.get("TALENTA_CLIENT_SECRET", "")
    company_id    = cfg.get("TALENTA_COMPANY_ID", "")

    if client_id and client_secret and company_id:
        try:
            sys.path.insert(0, str(Path(__file__).parent))
            from talenta_client import TalentaClient
            print("[Sync] Connecting to Mekari Talenta API…")
            client = TalentaClient(
                client_id, client_secret, company_id,
                base_url=cfg.get("TALENTA_BASE_URL", "https://api.mekari.com"),
            )
            raw_list = client.get_all_employees()
            employees = [client.map_employee(e) for e in raw_list]
            print(f"[Sync] ✓ Fetched {len(employees)} employees from Talenta")
            return employees, "talenta"
        except Exception as exc:
            print(f"[Sync] ✗ Talenta API failed: {exc}")
            print("[Sync] Falling back to cached data…")

    # Try cache
    if CACHE_FILE.exists():
        try:
            cached = json.loads(CACHE_FILE.read_text())
            employees = cached.get("employees", [])
            if employees:
                print(f"[Sync] Using cached data ({len(employees)} employees)")
                return employees, "cache"
        except Exception:
            pass

    # Use mock data
    print("[Sync] Using mock data (add Talenta credentials to hris/.env to use live data)")
    return MOCK_EMPLOYEES_RAW, "mock"


def enrich_employees(raw_list: list[dict]) -> list[dict]:
    result = []
    for e in raw_list:
        end   = e.get("contract_end_date", "")
        start = e.get("contract_start_date", "")
        result.append({
            **e,
            "days_remaining": days_remaining(end),
            "status":         status_of(end, start),
        })
    return sorted(result, key=lambda x: x["days_remaining"])


def save_employees_json(employees: list[dict], source: str):
    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source":        source,
        "employees":     employees,
    }
    CACHE_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"[Sync] employees.json updated ({len(employees)} employees, source={source})")

# ── Email HTML builder ────────────────────────────────────────

STATUS_COLOR = {"expired":"#dc2626","critical":"#dc2626","urgent":"#ea580c","expiring":"#d97706","recently_renewed":"#2563eb","active":"#16a34a"}
STATUS_BG    = {"expired":"#fee2e2","critical":"#fee2e2","urgent":"#ffedd5","expiring":"#fef3c7","recently_renewed":"#dbeafe","active":"#dcfce7"}
STATUS_LABEL = {"expired":"Expired","critical":"Critical","urgent":"Urgent","expiring":"Expiring Soon","recently_renewed":"Renewed","active":"Active"}


def _row(e: dict) -> str:
    d     = e["days_remaining"]
    st    = e["status"]
    color = STATUS_COLOR.get(st, "#475569")
    bg    = STATUS_BG.get(st, "#f8fafc")
    label = STATUS_LABEL.get(st, st.title())
    return f"""
        <tr style="border-top:1px solid #f1f5f9">
          <td style="padding:13px 16px">
            <div style="font-weight:600;color:#0f172a;font-size:14px">{e['name']}</div>
            <div style="color:#94a3b8;font-size:11px;margin-top:2px">{e['employee_id']} · {e['position']}</div>
            <div style="color:#94a3b8;font-size:11px">{e['branch']} · {e['department']}</div>
          </td>
          <td style="padding:13px 16px;white-space:nowrap;font-weight:700;color:{color};font-size:14px">{fmt_days(d)}</td>
          <td style="padding:13px 16px;white-space:nowrap;color:#475569;font-size:13px">{fmt_date(e['contract_end_date'])}</td>
          <td style="padding:13px 16px">
            <span style="display:inline-block;padding:3px 10px;border-radius:99px;background:{bg};color:{color};font-size:11px;font-weight:700">{label}</span>
          </td>
        </tr>"""


def _section(title: str, color: str, rows: list[dict]) -> str:
    if not rows:
        return ""
    return f"""
      <tr><td style="padding:8px 36px 4px">
        <p style="margin:0;font-size:12px;font-weight:700;color:{color};text-transform:uppercase;letter-spacing:.06em">{title} — {len(rows)} employee{"s" if len(rows)!=1 else ""}</p>
      </td></tr>
      <tr><td style="padding:0 36px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <thead><tr style="background:#f8fafc">
            <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Employee</th>
            <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Days Left</th>
            <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Expires On</th>
            <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Status</th>
          </tr></thead>
          <tbody>{"".join(_row(e) for e in rows)}</tbody>
        </table>
      </td></tr>"""


def build_email_html(employees: list[dict], cfg: dict, source: str) -> str:
    days_ahead     = int(cfg.get("REPORT_DAYS_AHEAD", 30))
    company        = cfg.get("COMPANY_NAME", "Your Company")
    recipient      = cfg.get("EMAIL_TO", "")
    week_end       = TODAY + timedelta(days=days_ahead)
    source_label   = {"talenta":"Live from Mekari Talenta","cache":"Cached data","mock":"Demo data"}.get(source, source)

    expired  = [e for e in employees if e["status"] == "expired"]
    critical = [e for e in employees if e["status"] == "critical"]
    urgent   = [e for e in employees if e["status"] == "urgent"]
    expiring = [e for e in employees if e["status"] == "expiring"]
    active   = [e for e in employees if e["status"] == "active"]
    renewed  = [e for e in employees if e["status"] == "recently_renewed"]

    attention = expired + critical + urgent + expiring
    needs_action = len(expired) + len(critical)

    banner = ""
    if needs_action:
        banner = f"""
      <tr><td style="padding:0 36px 20px">
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;display:flex;align-items:start;gap:10px">
          <span style="font-size:18px;flex-shrink:0">⚠️</span>
          <div>
            <p style="margin:0;font-size:14px;font-weight:700;color:#991b1b">Immediate Action Required</p>
            <p style="margin:4px 0 0;font-size:13px;color:#dc2626">
              {needs_action} contract{"s" if needs_action!=1 else ""} {"have" if needs_action!=1 else "has"} expired or expire{"s" if needs_action==1 else ""} within 7 days.
              Please coordinate with department managers immediately.
            </p>
          </div>
        </div>
      </td></tr>"""

    stat = lambda n, label, color, bg: f"""
          <td style="padding-right:10px">
            <div style="background:{bg};border-radius:10px;padding:12px 16px;text-align:center;min-width:70px">
              <div style="font-size:24px;font-weight:800;color:{color}">{n}</div>
              <div style="font-size:10px;font-weight:700;color:{color};text-transform:uppercase;letter-spacing:.05em;margin-top:2px">{label}</div>
            </div>
          </td>"""

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:36px 16px">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#2563eb 100%);padding:32px 36px">
    <div style="display:inline-block;background:rgba(255,255,255,.12);border-radius:8px;padding:5px 12px;margin-bottom:14px">
      <span style="color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Weekly HR Report · {company}</span>
    </div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;line-height:1.3">
      Contract Expiry Summary
    </h1>
    <p style="margin:8px 0 0;color:#93c5fd;font-size:13px">
      Week of {TODAY.strftime("%-d %B %Y")} — {source_label}
    </p>
  </td></tr>

  <!-- Stats -->
  <tr><td style="padding:24px 36px 20px">
    <table cellpadding="0" cellspacing="0">
      <tr>
        {stat(len(expired),  "Expired",  "#dc2626", "#fee2e2")}
        {stat(len(critical), "Critical", "#dc2626", "#fef2f2")}
        {stat(len(urgent),   "Urgent",   "#ea580c", "#ffedd5")}
        {stat(len(expiring), "Expiring", "#d97706", "#fef3c7")}
        {stat(len(active),   "Active",   "#16a34a", "#dcfce7")}
        {stat(len(renewed),  "Renewed",  "#2563eb", "#dbeafe")}
      </tr>
    </table>
  </td></tr>

  {banner}

  <!-- Sections -->
  {"".join([
      _section("🔴 Expired — Action Required Now", "#dc2626", expired),
      _section("🔴 Critical — Expires Within 7 Days", "#dc2626", critical),
      _section("🟠 Urgent — Expires in 8–14 Days", "#ea580c", urgent),
      _section("🟡 Expiring Soon — Within 30 Days", "#d97706", expiring),
  ])}

  <!-- No attention items -->
  {"" if attention else """
  <tr><td style="padding:20px 36px">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;text-align:center">
      <p style="margin:0;font-size:28px">✅</p>
      <p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#166534">All contracts are in good standing</p>
      <p style="margin:4px 0 0;font-size:13px;color:#16a34a">No contracts expiring within the next 30 days</p>
    </div>
  </td></tr>"""}

  <!-- Divider -->
  <tr><td style="padding:4px 36px 24px">
    <hr style="border:none;border-top:1px solid #f1f5f9;margin:0">
  </td></tr>

  <!-- Summary line -->
  <tr><td style="padding:0 36px 24px">
    <p style="margin:0;font-size:13px;color:#64748b">
      Total monitored: <strong>{len(employees)}</strong> employees &nbsp;·&nbsp;
      Reporting period: next <strong>{days_ahead} days</strong> &nbsp;·&nbsp;
      Data as of: <strong>{TODAY.strftime("%-d %b %Y")}</strong>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center">
    <p style="margin:0;font-size:12px;color:#94a3b8">
      Automated weekly report from <strong>HR Contract Management System</strong><br>
      Sent to {recipient} every Monday at 08:00 WIB
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>"""


def build_plain_text(employees: list[dict], cfg: dict) -> str:
    company    = cfg.get("COMPANY_NAME", "Your Company")
    days_ahead = int(cfg.get("REPORT_DAYS_AHEAD", 30))
    attention  = [e for e in employees if e["status"] in ("expired","critical","urgent","expiring")]

    lines = [
        f"HR WEEKLY CONTRACT EXPIRY REPORT — {company}",
        f"Week of {TODAY.strftime('%-d %B %Y')}",
        "=" * 60,
        f"Total employees monitored: {len(employees)}",
        f"Reporting window:          next {days_ahead} days",
        "",
    ]
    groups = [
        ("EXPIRED",           [e for e in employees if e["status"]=="expired"]),
        ("CRITICAL (≤7 days)",[e for e in employees if e["status"]=="critical"]),
        ("URGENT (8–14 days)",[e for e in employees if e["status"]=="urgent"]),
        ("EXPIRING (≤30 days)",[e for e in employees if e["status"]=="expiring"]),
    ]
    for label, group in groups:
        if not group:
            continue
        lines += [f"\n{label} — {len(group)} employee{'s' if len(group)!=1 else ''}", "-"*50]
        for e in group:
            lines.append(f"  {e['name']:<30} {fmt_days(e['days_remaining']):<15} {fmt_date(e['contract_end_date'])}")

    if not attention:
        lines += ["", "✓ No contracts expiring within 30 days. All good!"]

    lines += ["", "─"*60, "HR Contract Management System — automated weekly report"]
    return "\n".join(lines)

# ── Send email ────────────────────────────────────────────────

def send_email(html: str, plain: str, employees: list[dict], cfg: dict):
    smtp_host = cfg.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(cfg.get("SMTP_PORT", 587))
    smtp_user = cfg.get("SMTP_USER", "")
    smtp_pass = cfg.get("SMTP_APP_PASSWORD", "").replace(" ", "")
    from_addr = cfg.get("EMAIL_FROM", smtp_user)
    to_addr   = cfg.get("EMAIL_TO", "")
    cc_raw    = cfg.get("EMAIL_CC", "")
    cc_list   = [a.strip() for a in cc_raw.split(",") if a.strip()]

    attention_count = sum(1 for e in employees if e["status"] in ("expired","critical","urgent","expiring"))
    subject = (
        f"[HR Alert] {attention_count} Contract{'s' if attention_count!=1 else ''} Need Attention — {TODAY.strftime('%-d %b %Y')}"
        if attention_count
        else f"[HR Weekly] All Contracts OK — {TODAY.strftime('%-d %b %Y')}"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = to_addr
    if cc_list:
        msg["Cc"] = ", ".join(cc_list)
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html,  "html"))

    all_recipients = [to_addr] + cc_list

    print(f"[Email] Connecting to {smtp_host}:{smtp_port}…")
    with smtplib.SMTP(smtp_host, smtp_port) as s:
        s.ehlo()
        s.starttls()
        s.login(smtp_user, smtp_pass)
        s.sendmail(smtp_user, all_recipients, msg.as_string())
    print(f"[Email] ✓ Sent to {', '.join(all_recipients)}")
    print(f"[Email]   Subject: {subject}")

# ── Main ──────────────────────────────────────────────────────

def run(send_mail: bool = True):
    print(f"\n{'━'*55}")
    print(f"  HR Weekly Report — {TODAY.strftime('%-d %B %Y')}")
    print(f"{'━'*55}")

    cfg = load_env(ENV_FILE)

    # 1. Sync employees
    raw_employees, source = sync_from_talenta(cfg)
    employees = enrich_employees(raw_employees)

    # 2. Save to employees.json (dashboard reads this)
    save_employees_json(employees, source)

    # 3. Build and send email
    if send_mail:
        html  = build_email_html(employees, cfg, source)
        plain = build_plain_text(employees, cfg)
        send_email(html, plain, employees, cfg)
    else:
        print("[Email] Skipped (dry-run mode)")

    attention = [e for e in employees if e["status"] in ("expired","critical","urgent","expiring")]
    print(f"\n[Done] {len(employees)} employees synced, {len(attention)} need attention")
    print(f"{'━'*55}\n")
    return employees


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    run(send_mail=not dry_run)
