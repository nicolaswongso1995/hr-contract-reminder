-- ============================================================
-- HR Contract Reminder - Database Migration
-- Run: psql $DATABASE_URL -f scripts/migrate.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Employees ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         VARCHAR(50)  UNIQUE NOT NULL,
  name                VARCHAR(255) NOT NULL,
  position            VARCHAR(255),
  department          VARCHAR(255),
  branch              VARCHAR(255),
  email               VARCHAR(255),
  phone               VARCHAR(50),
  contract_start_date DATE NOT NULL,
  contract_end_date   DATE NOT NULL,
  manager_email       VARCHAR(255),
  talenta_id          VARCHAR(100) UNIQUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Notification Logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id       UUID         REFERENCES employees(id) ON DELETE CASCADE,
  employee_name     VARCHAR(255),
  notification_type VARCHAR(20)  CHECK (notification_type IN ('email', 'whatsapp')),
  reminder_days     INTEGER      CHECK (reminder_days IN (1, 7, 14, 30)),
  sent_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  status            VARCHAR(20)  CHECK (status IN ('sent', 'failed')),
  error             TEXT
);

-- ── Sync Logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synced_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  employees_synced  INTEGER      NOT NULL DEFAULT 0,
  status            VARCHAR(20)  CHECK (status IN ('success', 'failed', 'partial')),
  error             TEXT,
  source            VARCHAR(20)  NOT NULL DEFAULT 'talenta'
                    CHECK (source IN ('talenta', 'manual', 'mock'))
);

-- ── App Settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        VARCHAR(100) UNIQUE NOT NULL,
  value      JSONB        NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Auto-update updated_at trigger ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_contract_end_date
  ON employees(contract_end_date);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id
  ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch
  ON employees(branch);
CREATE INDEX IF NOT EXISTS idx_notification_logs_employee_id
  ON notification_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at
  ON notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_reminder_days
  ON notification_logs(reminder_days, status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at
  ON sync_logs(synced_at DESC);

-- ── Default Settings ──────────────────────────────────────────
INSERT INTO app_settings (key, value) VALUES
  ('reminder_configs', '[
    {"days": 30, "enabled": true,  "email": true, "whatsapp": false},
    {"days": 14, "enabled": true,  "email": true, "whatsapp": false},
    {"days": 7,  "enabled": true,  "email": true, "whatsapp": true},
    {"days": 1,  "enabled": true,  "email": true, "whatsapp": true}
  ]'),
  ('company_settings', '{
    "company_name":     "Your Company",
    "email_from":       "HR System <hr@company.com>",
    "email_recipients": [],
    "whatsapp_enabled": false,
    "sync_schedule":    "0 8 * * *"
  }')
ON CONFLICT (key) DO NOTHING;
