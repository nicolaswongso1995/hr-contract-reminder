"use client";

import { useState } from "react";
import {
  Bell, Mail, MessageCircle, RefreshCw,
  Save, CheckCircle2, Database, Key,
} from "lucide-react";

interface ReminderRow {
  days: number;
  enabled: boolean;
  email: boolean;
  whatsapp: boolean;
}

const defaultReminders: ReminderRow[] = [
  { days: 30, enabled: true,  email: true,  whatsapp: false },
  { days: 14, enabled: true,  email: true,  whatsapp: false },
  { days: 7,  enabled: true,  email: true,  whatsapp: true  },
  { days: 1,  enabled: true,  email: true,  whatsapp: true  },
];

export default function SettingsPage() {
  const [reminders, setReminders] = useState<ReminderRow[]>(defaultReminders);
  const [saved, setSaved] = useState(false);

  function toggleReminder(index: number, field: keyof ReminderRow) {
    setReminders((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, [field]: !r[field as keyof typeof r] } : r
      )
    );
  }

  function handleSave() {
    // In production: POST /api/settings with JSON body
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Configure notifications, integrations, and system preferences
        </p>
      </div>

      {/* Reminder configuration */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Bell className="w-4.5 h-4.5 text-blue-600" size={18} />
          <h2 className="section-title">Reminder Schedule</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Configure when reminder notifications are sent before contract expiry.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Days Before Expiry</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Enabled</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reminders.map((row, i) => (
                  <tr key={row.days} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {row.days === 1 ? "1 day (day before)" : `${row.days} days`}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Toggle value={row.enabled} onChange={() => toggleReminder(i, "enabled")} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Toggle
                        value={row.email}
                        disabled={!row.enabled}
                        onChange={() => toggleReminder(i, "email")}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Toggle
                        value={row.whatsapp}
                        disabled={!row.enabled}
                        onChange={() => toggleReminder(i, "whatsapp")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Integration status */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Database className="w-4.5 h-4.5 text-blue-600" size={18} />
          <h2 className="section-title">Integration Status</h2>
        </div>
        <div className="p-6 space-y-3">
          <IntegrationRow
            label="Talenta HRIS API"
            description="Sync employee data from Mekari Talenta"
            env="TALENTA_CLIENT_ID"
          />
          <IntegrationRow
            label="Supabase PostgreSQL"
            description="Persistent data storage"
            env="NEXT_PUBLIC_SUPABASE_URL"
          />
          <IntegrationRow
            label="SMTP Email"
            description="Contract expiry email notifications"
            env="SMTP_HOST"
          />
          <IntegrationRow
            label="WhatsApp API"
            description="Instant messaging notifications"
            env="WHATSAPP_API_TOKEN"
          />
        </div>
      </section>

      {/* Sync configuration */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <RefreshCw className="w-4.5 h-4.5 text-blue-600" size={18} />
          <h2 className="section-title">Sync Schedule</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cron Expression
            </label>
            <input
              type="text"
              defaultValue="0 8 * * *"
              className="input font-mono text-sm"
              placeholder="0 8 * * *"
            />
            <p className="text-xs text-gray-400 mt-1">
              Default: 08:00 AM daily (Asia/Jakarta). Format: minute hour day month weekday
            </p>
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" />Saved!</>
          ) : (
            <><Save className="w-4 h-4" />Save Settings</>
          )}
        </button>
        <p className="text-xs text-gray-400">
          Changes to integration credentials require environment variable updates.
        </p>
      </div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${
        value ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function IntegrationRow({
  label,
  description,
  env,
}: {
  label: string;
  description: string;
  env: string;
}) {
  const isSet = typeof window === "undefined" ? false : false; // env vars not exposed to client
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
          {env}
        </code>
        <span className="text-xs text-gray-400">via .env.local</span>
      </div>
    </div>
  );
}
