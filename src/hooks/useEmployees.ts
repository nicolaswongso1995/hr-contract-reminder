"use client";

import { useState, useEffect, useCallback } from "react";
import type { Employee, FilterOptions } from "@/types";

interface UseEmployeesResult {
  employees: Employee[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
  setFilters: (f: Partial<FilterOptions>) => void;
  refresh: () => void;
}

const DEFAULT_FILTERS: FilterOptions = {
  status: "all",
  sortBy: "days_remaining",
  sortOrder: "asc",
  page: 1,
  limit: 20,
};

export function useEmployees(initial?: Partial<FilterOptions>): UseEmployeesResult {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<FilterOptions>({
    ...DEFAULT_FILTERS,
    ...initial,
  });
  const [tick, setTick] = useState(0);

  const setFilters = useCallback((partial: Partial<FilterOptions>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.branch) params.set("branch", filters.branch);
    if (filters.department) params.set("department", filters.department);
    if (filters.search) params.set("search", filters.search);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
    params.set("page", String(filters.page ?? 1));
    params.set("limit", String(filters.limit ?? 20));

    fetch(`/api/employees?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setEmployees(json.data ?? []);
        setTotal(json.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load employees");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters, tick]);

  return { employees, total, loading, error, filters, setFilters, refresh };
}
