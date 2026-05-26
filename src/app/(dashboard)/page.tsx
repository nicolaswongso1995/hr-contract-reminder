"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, CalendarX2, RefreshCcw,
  Users, TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ExpiryChart } from "@/components/dashboard/ExpiryChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import type { DashboardStats, Employee } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, empRes] = await Promise.all([
          fetch("/api/employees?stats=true"),
          fetch("/api/employees?limit=100"),
        ]);
        const statsJson = await statsRes.json();
        const empJson = await empRes.json();
        setStats(statsJson.data);
        setEmployees(empJson.data ?? []);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">{today}</p>
      </div>

      {/* Skeleton / Stats cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Already Expired"
            value={stats.already_expired}
            description="Require immediate action"
            icon={CalendarX2}
            variant="danger"
          />
          <StatsCard
            title="Expiring This Week"
            value={stats.expiring_this_week}
            description="Within the next 7 days"
            icon={AlertTriangle}
            variant="warning"
          />
          <StatsCard
            title="Expiring This Month"
            value={stats.expiring_this_month}
            description="Within 30 days"
            icon={TrendingUp}
            variant="info"
          />
          <StatsCard
            title="Recently Renewed"
            value={stats.recently_renewed}
            description="Renewed in the last 30 days"
            icon={RefreshCcw}
            variant="success"
          />
        </div>
      ) : null}

      {/* Secondary stats row */}
      {stats && !loading && (
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Total Employees"
            value={stats.total_employees}
            description="All tracked contracts"
            icon={Users}
          />
          <StatsCard
            title="Active Contracts"
            value={stats.active_contracts}
            description="31+ days remaining"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
      )}

      {/* Charts */}
      {!loading && employees.length > 0 && (
        <ExpiryChart employees={employees} />
      )}

      {/* Recent activity */}
      <RecentActivity />

      {/* Alert banner for critical/urgent */}
      {!loading && (stats?.expiring_this_week ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {stats!.expiring_this_week} contract{stats!.expiring_this_week !== 1 ? "s" : ""} expire
              {stats!.expiring_this_week === 1 ? "s" : ""} this week
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Review the Employees page and take action immediately to avoid service disruption.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
