"use client";

import { useState, useEffect } from "react";
import type { DashboardStats, Employee } from "@/types";

interface UseDashboardResult {
  stats: DashboardStats | null;
  employees: Employee[];
  loading: boolean;
  error: string | null;
  lastSync: string | null;
}

export function useDashboard(): UseDashboardResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, empRes, syncRes] = await Promise.all([
          fetch("/api/employees?stats=true"),
          fetch("/api/employees?limit=100&sortBy=days_remaining&sortOrder=asc"),
          fetch("/api/sync"),
        ]);

        const [statsJson, empJson, syncJson] = await Promise.all([
          statsRes.json(),
          empRes.json(),
          syncRes.json(),
        ]);

        if (cancelled) return;
        setStats(statsJson.data ?? null);
        setEmployees(empJson.data ?? []);
        setLastSync(syncJson.data?.last_sync ?? null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { stats, employees, loading, error, lastSync };
}
