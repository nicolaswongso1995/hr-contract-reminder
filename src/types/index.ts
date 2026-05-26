// ── Contract Status ───────────────────────────────────────────
export type ContractStatus =
  | "expired"          // past end date
  | "critical"         // 1–7 days remaining
  | "urgent"           // 8–14 days remaining
  | "expiring"         // 15–30 days remaining
  | "active"           // 31+ days remaining
  | "recently_renewed"; // renewed in the last 30 days

// ── Core Employee ─────────────────────────────────────────────
export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  position: string;
  department: string;
  branch: string;
  email: string;
  phone?: string;
  contract_start_date: string; // ISO date "YYYY-MM-DD"
  contract_end_date: string;   // ISO date "YYYY-MM-DD"
  days_remaining: number;
  status: ContractStatus;
  manager_email?: string;
  talenta_id?: string;
  created_at: string;
  updated_at: string;
}

// ── Dashboard ─────────────────────────────────────────────────
export interface DashboardStats {
  total_employees: number;
  expiring_this_week: number;
  expiring_this_month: number;
  already_expired: number;
  recently_renewed: number;
  active_contracts: number;
}

export interface MonthlyExpiryData {
  month: string;  // "Jan", "Feb", …
  count: number;
}

// ── Notification Log ──────────────────────────────────────────
export interface NotificationLog {
  id: string;
  employee_id: string;
  employee_name: string;
  notification_type: "email" | "whatsapp";
  reminder_days: 1 | 7 | 14 | 30;
  sent_at: string;
  status: "sent" | "failed";
  error?: string;
}

// ── Sync Log ──────────────────────────────────────────────────
export interface SyncLog {
  id: string;
  synced_at: string;
  employees_synced: number;
  status: "success" | "failed" | "partial";
  error?: string;
  source: "talenta" | "manual" | "mock";
}

// ── Talenta (Mekari) API ──────────────────────────────────────
export interface TalentaEmployee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: { id: string; name: string };
  organization: { id: string; name: string };
  branch: { id: string; name: string };
  employment: {
    contract_start_date: string;
    contract_end_date: string;
    employment_type: string;
    manager_email?: string;
  };
}

export interface TalentaApiResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ── API Responses ──────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

// ── Filters ───────────────────────────────────────────────────
export interface FilterOptions {
  status?: ContractStatus | "all";
  branch?: string;
  department?: string;
  search?: string;
  sortBy?: "name" | "days_remaining" | "contract_end_date" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// ── Auth / User ───────────────────────────────────────────────
export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "hr_manager" | "viewer";
}

// ── Settings ──────────────────────────────────────────────────
export interface ReminderConfig {
  days: 1 | 7 | 14 | 30;
  enabled: boolean;
  email: boolean;
  whatsapp: boolean;
}

export interface AppSettings {
  reminder_configs: ReminderConfig[];
  company_name: string;
  email_from: string;
  email_recipients: string[];
  whatsapp_enabled: boolean;
  sync_schedule: string;
}

// ── Report ────────────────────────────────────────────────────
export type ReportFormat = "csv" | "pdf";

export interface ReportOptions {
  format: ReportFormat;
  status?: ContractStatus | "all";
  branch?: string;
  dateFrom?: string;
  dateTo?: string;
}
