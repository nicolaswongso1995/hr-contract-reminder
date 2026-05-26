"use client";

import { Mail, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { mockNotificationLogs } from "@/lib/mock-data";
import type { NotificationLog } from "@/types";

interface RecentActivityProps {
  logs?: NotificationLog[];
}

export function RecentActivity({ logs = mockNotificationLogs }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="section-title">Recent Notifications</h3>
        <span className="text-xs text-gray-400">{logs.length} entries</span>
      </div>
      <div className="divide-y divide-gray-50">
        {logs.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-400 text-sm">
            No notifications sent yet.
          </p>
        ) : (
          logs.slice(0, 8).map((log) => (
            <ActivityRow key={log.id} log={log} />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityRow({ log }: { log: NotificationLog }) {
  const isEmail = log.notification_type === "email";
  const Icon = isEmail ? Mail : MessageCircle;
  const iconBg = isEmail ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600";

  return (
    <div className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
      <div className={`p-2 rounded-lg flex-shrink-0 ${iconBg}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {log.employee_name}
        </p>
        <p className="text-xs text-gray-500">
          {isEmail ? "Email" : "WhatsApp"} reminder — {log.reminder_days} day
          {log.reminder_days !== 1 ? "s" : ""} before expiry
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {log.status === "sent" ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        <span className="text-xs text-gray-400 hidden sm:block">
          {formatDateTime(log.sent_at)}
        </span>
      </div>
    </div>
  );
}
