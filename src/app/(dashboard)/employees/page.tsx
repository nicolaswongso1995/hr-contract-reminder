"use client";

import { useEffect, useState, useCallback } from "react";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import type { Employee, FilterOptions } from "@/types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    sortBy: "days_remaining",
    sortOrder: "asc",
    page: 1,
    limit: 20,
  });

  const fetchEmployees = useCallback(async (f: FilterOptions) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.status && f.status !== "all") params.set("status", f.status);
      if (f.branch) params.set("branch", f.branch);
      if (f.department) params.set("department", f.department);
      if (f.search) params.set("search", f.search);
      if (f.sortBy) params.set("sortBy", f.sortBy);
      if (f.sortOrder) params.set("sortOrder", f.sortOrder);
      params.set("page", String(f.page ?? 1));
      params.set("limit", String(f.limit ?? 20));

      const res = await fetch(`/api/employees?${params}`);
      const json = await res.json();
      setEmployees(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees(filters);
  }, [filters, fetchEmployees]);

  function handleFiltersChange(partial: Partial<FilterOptions>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage and monitor all employee contracts
        </p>
      </div>

      <EmployeeTable
        employees={employees}
        total={total}
        loading={loading}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  );
}
