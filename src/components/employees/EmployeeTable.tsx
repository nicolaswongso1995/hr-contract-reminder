"use client";

import { useState, useCallback } from "react";
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Download, Send, MoreHorizontal, Loader2,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmployeeFilters } from "./EmployeeFilters";
import { formatDate, formatDaysRemaining, cn } from "@/lib/utils";
import type { Employee, FilterOptions } from "@/types";

interface EmployeeTableProps {
  employees: Employee[];
  total: number;
  loading?: boolean;
  filters: FilterOptions;
  onFiltersChange: (f: Partial<FilterOptions>) => void;
}

type SortKey = "name" | "days_remaining" | "contract_end_date" | "status";

export function EmployeeTable({
  employees,
  total,
  loading,
  filters,
  onFiltersChange,
}: EmployeeTableProps) {
  const [exportLoading, setExportLoading] = useState(false);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  function handleSort(key: SortKey) {
    const sameKey = filters.sortBy === key;
    onFiltersChange({
      sortBy: key,
      sortOrder: sameKey && filters.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    });
  }

  const SortIcon = useCallback(({ col }: { col: SortKey }) => {
    if (filters.sortBy !== col) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return filters.sortOrder === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500" />
      : <ChevronDown className="w-3 h-3 text-blue-500" />;
  }, [filters.sortBy, filters.sortOrder]);

  async function handleExportCsv() {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("format", "csv");
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.branch) params.set("branch", filters.branch);

      const res = await fetch(`/api/reports/export?${params}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hr-contracts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  const cols: { key: SortKey | null; label: string; sortable?: boolean }[] = [
    { key: null,                label: "Employee",       sortable: false },
    { key: "days_remaining",    label: "Days Left",      sortable: true  },
    { key: "contract_end_date", label: "Contract End",   sortable: true  },
    { key: null,                label: "Contract Start", sortable: false },
    { key: "status",            label: "Status",         sortable: true  },
    { key: null,                label: "",               sortable: false },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <EmployeeFilters filters={filters} onChange={onFiltersChange} />

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="section-title">Employee Contracts</h3>
            <p className="text-xs text-gray-400 mt-0.5">{total} employees</p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={exportLoading}
            className="btn-secondary text-xs"
          >
            {exportLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {cols.map((col, i) => (
                  <th
                    key={i}
                    onClick={() => col.sortable && col.key && handleSort(col.key as SortKey)}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap",
                      col.sortable && "cursor-pointer hover:text-gray-700 select-none",
                      i === 0 && "pl-6",
                      i === cols.length - 1 && "pr-6"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && col.key && <SortIcon col={col.key as SortKey} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading employees…</p>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-sm">
                    No employees match the current filters.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <EmployeeRow key={emp.id} employee={emp} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onFiltersChange({ page: page - 1 })}
                disabled={page <= 1}
                className="p-1.5 rounded-md disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => onFiltersChange({ page: page + 1 })}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeRow({ employee: emp }: { employee: Employee }) {
  const daysClass =
    emp.days_remaining < 0    ? "text-red-600 font-bold" :
    emp.days_remaining <= 7   ? "text-red-600 font-semibold" :
    emp.days_remaining <= 14  ? "text-orange-600 font-semibold" :
    emp.days_remaining <= 30  ? "text-amber-600 font-medium" :
    "text-gray-700";

  return (
    <tr className="table-row-hover">
      {/* Employee info */}
      <td className="pl-6 pr-4 py-3">
        <div>
          <p className="font-medium text-gray-900">{emp.name}</p>
          <p className="text-xs text-gray-400">{emp.employee_id} · {emp.position}</p>
          <p className="text-xs text-gray-400">{emp.branch} · {emp.department}</p>
        </div>
      </td>
      {/* Days left */}
      <td className={cn("px-4 py-3 whitespace-nowrap text-sm", daysClass)}>
        {formatDaysRemaining(emp.days_remaining)}
      </td>
      {/* Contract end */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {formatDate(emp.contract_end_date)}
      </td>
      {/* Contract start */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
        {formatDate(emp.contract_start_date)}
      </td>
      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={emp.status} size="sm" />
      </td>
      {/* Actions */}
      <td className="pr-6 pl-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 justify-end">
          <button
            title="Send reminder"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
          <button
            title="More options"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
