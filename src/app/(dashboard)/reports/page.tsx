"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import type { ContractStatus } from "@/types";

const STATUS_OPTIONS: { value: ContractStatus | "all"; label: string }[] = [
  { value: "all",              label: "All Statuses"   },
  { value: "expired",         label: "Expired"         },
  { value: "critical",        label: "Critical (≤7d)"  },
  { value: "urgent",          label: "Urgent (8–14d)"  },
  { value: "expiring",        label: "Expiring (≤30d)" },
  { value: "active",          label: "Active"          },
  { value: "recently_renewed", label: "Recently Renewed"},
];

export default function ReportsPage() {
  const [status, setStatus] = useState<ContractStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState<"csv" | "pdf" | null>(null);

  async function handleExport(format: "csv" | "pdf") {
    setLoading(format);
    try {
      const params = new URLSearchParams({ format });
      if (status !== "all") params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/reports/export?${params}`);
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `hr-report.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Export employee contract data in CSV or PDF format
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="section-title">Export Configuration</h2>

          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contract Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContractStatus | "all")}
              className="input"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contract End — From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contract End — To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => handleExport("csv")}
              disabled={!!loading}
              className="btn-primary"
            >
              {loading === "csv"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileSpreadsheet className="w-4 h-4" />}
              Export CSV
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={!!loading}
              className="btn-secondary"
            >
              {loading === "pdf"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileText className="w-4 h-4" />}
              Export JSON (PDF via jsPDF)
            </button>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">CSV Export</span>
            </div>
            <p className="text-xs text-blue-600">
              Opens in Excel, Google Sheets, or any spreadsheet application.
              Includes all employee and contract fields.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Quick Links</span>
            </div>
            <div className="space-y-1">
              {["expired", "critical", "expiring"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatus(s as ContractStatus);
                    setTimeout(() => handleExport("csv"), 50);
                  }}
                  className="block text-xs text-blue-600 hover:underline"
                >
                  Export {s} contracts →
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
