"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import type { FilterOptions, ContractStatus } from "@/types";
import { BRANCHES, DEPARTMENTS } from "@/lib/mock-data";

interface EmployeeFiltersProps {
  filters: FilterOptions;
  onChange: (f: Partial<FilterOptions>) => void;
}

const STATUS_OPTIONS: { value: ContractStatus | "all"; label: string }[] = [
  { value: "all",              label: "All Statuses"   },
  { value: "expired",         label: "Expired"         },
  { value: "critical",        label: "Critical (≤7d)"  },
  { value: "urgent",          label: "Urgent (8–14d)"  },
  { value: "expiring",        label: "Expiring (≤30d)" },
  { value: "active",          label: "Active"          },
  { value: "recently_renewed", label: "Renewed"        },
];

export function EmployeeFilters({ filters, onChange }: EmployeeFiltersProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, ID, position…"
            value={filters.search ?? ""}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="input pl-9"
          />
        </div>

        {/* Status filter */}
        <select
          value={filters.status ?? "all"}
          onChange={(e) => onChange({ status: e.target.value as ContractStatus | "all", page: 1 })}
          className="input w-auto"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Branch filter */}
        <select
          value={filters.branch ?? ""}
          onChange={(e) => onChange({ branch: e.target.value || undefined, page: 1 })}
          className="input w-auto"
        >
          <option value="">All Branches</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Department filter */}
        <select
          value={filters.department ?? ""}
          onChange={(e) => onChange({ department: e.target.value || undefined, page: 1 })}
          className="input w-auto"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Clear filters */}
        <button
          onClick={() => onChange({ status: "all", branch: undefined, department: undefined, search: undefined, page: 1 })}
          className="btn-ghost text-xs"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
}
