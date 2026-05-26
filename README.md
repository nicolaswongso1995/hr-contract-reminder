# HR Contract Reminder

A modern, production-ready internal HR system for tracking employee contract expiry dates and sending automated reminders via email and WhatsApp.

Built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, and **Mekari Talenta API** integration.

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Stats cards, expiry timeline chart, status pie chart, recent notification log |
| **Employee Table** | Sortable, filterable, searchable with color-coded status badges |
| **Contract Tracking** | Days-remaining calculation with 6 status levels |
| **Email Reminders** | HTML email via Nodemailer — 30, 14, 7, 1 day intervals |
| **WhatsApp Reminders** | Fonnte, WA Cloud API, or custom webhook (placeholder ready) |
| **Talenta Integration** | HMAC-SHA256 OAuth2 sync, paginated employee fetch |
| **Daily Cron Job** | Standalone runner + API endpoint for Vercel Cron / GitHub Actions |
| **CSV Export** | Filtered employee data downloadable as CSV |
| **Responsive UI** | Mobile sidebar, dark nav, corporate design system |
| **Mock Data** | 15 realistic employees included for zero-config demo |
| **Docker Support** | Dockerfile + docker-compose for containerised deployment |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- (Optional) Supabase project
- (Optional) Mekari Talenta API credentials
- (Optional) SMTP credentials

### 1. Clone & Install

```bash
git clone <your-repo>
cd hr-contract-reminder
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at minimum:

```env
NEXTAUTH_SECRET=any-random-32-char-string
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=your-password
USE_MOCK_DATA=true          # Start with mock data, no DB needed
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the credentials you set above.

---

## Production Setup

### Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your **Project URL** and **anon key** to `.env.local`
3. Run the migration:

```bash
psql $DATABASE_URL -f scripts/migrate.sql
# or via Supabase SQL Editor: paste contents of scripts/migrate.sql
```

4. Set `USE_MOCK_DATA=false` in `.env.local`

### Talenta HRIS Integration

1. Log in to Mekari Developer Console
2. Create an OAuth2 application and note your **Client ID** and **Client Secret**
3. Add to `.env.local`:

```env
TALENTA_CLIENT_ID=your-client-id
TALENTA_CLIENT_SECRET=your-client-secret
TALENTA_COMPANY_ID=your-company-id
TALENTA_BASE_URL=https://api.mekari.com
USE_MOCK_DATA=false
```

The sync service (`src/services/syncService.ts`) automatically falls back to mock data if the API is unreachable.

### Email Notifications (Gmail example)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password   # Generate in Google Account > Security > App passwords
EMAIL_FROM="HR System <hr@company.com>"
EMAIL_TO=hr-team@company.com
ENABLE_EMAIL_NOTIFICATIONS=true
```

### WhatsApp Notifications (Fonnte)

```env
WHATSAPP_PROVIDER=fonnte
WHATSAPP_API_URL=https://api.fonnte.com/send
WHATSAPP_API_TOKEN=your-fonnte-token
ENABLE_WHATSAPP_NOTIFICATIONS=true
```

For **Meta WhatsApp Business API**, set `WHATSAPP_PROVIDER=waba` and `WABA_PHONE_NUMBER_ID=your-id`.

---

## Cron / Scheduler

### Option A — Standalone Process (Docker / VPS)

```bash
npm run cron:run
# Runs immediately then schedules via node-cron (CRON_SCHEDULE env var)
```

### Option B — Vercel Cron Jobs

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Set `CRON_SECRET` in your Vercel environment variables. Vercel will send `Authorization: Bearer <CRON_SECRET>` automatically.

### Option C — GitHub Actions

```yaml
# .github/workflows/cron.yml
name: Daily Contract Check
on:
  schedule:
    - cron: '0 1 * * *'   # 08:00 WIB = 01:00 UTC
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cron endpoint
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

---

## Docker

### Development

```bash
docker-compose up
```

### Production Build

```bash
docker build -t hr-contract-reminder .
docker run -p 3000:3000 --env-file .env.local hr-contract-reminder
```

---

## Project Structure

```
hr-contract-reminder/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page
│   │   ├── (dashboard)/           # Protected dashboard pages
│   │   │   ├── page.tsx           # Dashboard overview
│   │   │   ├── employees/         # Employee table & filters
│   │   │   ├── reports/           # CSV/PDF export
│   │   │   └── settings/          # Notification & integration config
│   │   └── api/
│   │       ├── auth/[...nextauth]/ # NextAuth handler
│   │       ├── employees/          # Employee data API
│   │       ├── sync/               # Talenta sync trigger
│   │       ├── cron/               # Cron endpoint (external trigger)
│   │       └── reports/export/     # Report download
│   ├── components/
│   │   ├── layout/    Sidebar, Header, MobileNav
│   │   ├── dashboard/ StatsCard, ExpiryChart, RecentActivity
│   │   ├── employees/ EmployeeTable, EmployeeFilters
│   │   └── shared/    StatusBadge
│   ├── services/
│   │   ├── employeeService.ts      # Data access (Supabase or mock)
│   │   ├── emailService.ts         # Nodemailer HTML emails
│   │   ├── whatsappService.ts      # Multi-provider WA sender
│   │   ├── notificationService.ts  # Reminder orchestration
│   │   ├── syncService.ts          # Talenta → Supabase sync
│   │   └── reportService.ts        # CSV/PDF generation
│   ├── lib/
│   │   ├── auth.ts                 # NextAuth options
│   │   ├── utils.ts                # Date helpers, status logic
│   │   ├── mock-data.ts            # 15 sample employees
│   │   ├── supabase/               # Browser & server clients
│   │   └── talenta/                # HMAC API client + types
│   ├── jobs/
│   │   └── contractChecker.ts      # Standalone cron runner
│   ├── hooks/
│   │   ├── useEmployees.ts
│   │   └── useDashboard.ts
│   ├── types/index.ts              # All TypeScript interfaces
│   └── middleware.ts               # Auth route protection
├── scripts/migrate.sql             # Supabase schema
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Contract Status System

| Status | Condition | Badge Color |
|---|---|---|
| `expired` | Past end date | Red |
| `critical` | 1–7 days remaining | Red (pulse) |
| `urgent` | 8–14 days remaining | Orange |
| `expiring` | 15–30 days remaining | Amber |
| `active` | 31+ days remaining | Green |
| `recently_renewed` | Contract started in last 30 days | Blue |

---

## Reminder Logic

The daily cron job sends notifications when `days_remaining` exactly matches a configured threshold:

| Threshold | Email | WhatsApp |
|---|---|---|
| 30 days | ✓ | — |
| 14 days | ✓ | — |
| 7 days | ✓ | ✓ |
| 1 day | ✓ | ✓ |

Each threshold checks `notification_logs` to avoid duplicate sends on the same day.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list with descriptions.

Key variables:

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_SECRET` | Yes | 32+ char random string |
| `ADMIN_EMAIL` | Yes | Login email |
| `ADMIN_PASSWORD` | Yes | Login password |
| `USE_MOCK_DATA` | — | `true` skips Supabase & Talenta |
| `NEXT_PUBLIC_SUPABASE_URL` | Prod | Supabase project URL |
| `TALENTA_CLIENT_ID` | Prod | Mekari OAuth client ID |
| `CRON_SECRET` | Prod | Protects `/api/cron` endpoint |
| `ENABLE_EMAIL_NOTIFICATIONS` | — | `false` by default (safe) |

---

## License

MIT — for internal enterprise use.
