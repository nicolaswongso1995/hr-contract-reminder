"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import type { Employee } from "@/types";
import { addMonths, format, isBefore, isAfter, parseISO, startOfMonth, endOfMonth } from "date-fns";

interface ExpiryChartProps {
  employees: Employee[];
}

const STATUS_COLORS = {
  expired: "#dc2626",
  critical: "#ef4444",
  urgent: "#f97316",
  expiring: "#f59e0b",
  active: "#22c55e",
  recently_renewed: "#3b82f6",
};

const STATUS_LABELS = {
  expired: "Expired",
  critical: "Critical (≤7d)",
  urgent: "Urgent (8–14d)",
  expiring: "Expiring (15–30d)",
  active: "Active",
  recently_renewed: "Renewed",
};

export function ExpiryChart({ employees }: ExpiryChartProps) {
  // Build monthly expiry data for the next 6 months
  const today = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = addMonths(today, i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const count = employees.filter((e) => {
      const d = parseISO(e.contract_end_date);
      return isAfter(d, start) && isBefore(d, end);
    }).length;
    return { month: format(month, "MMM yy"), count };
  });

  // Build status distribution for pie chart
  const statusGroups = Object.entries(
    employees.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([status, count]) => ({
      name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status,
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? "#94a3b8",
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* Bar chart — expiry timeline */}
      <div className="xl:col-span-3 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="section-title mb-1">Upcoming Contract Expirations</h3>
        <p className="text-xs text-gray-400 mb-5">Next 6 months</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: 13 }}
              cursor={{ fill: "#f1f5f9" }}
            />
            <Bar dataKey="count" name="Contracts" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              {monthlyData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.count >= 3 ? "#ef4444" : entry.count >= 2 ? "#f97316" : "#3b82f6"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart — status distribution */}
      <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="section-title mb-1">Contract Status</h3>
        <p className="text-xs text-gray-400 mb-2">Distribution</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={statusGroups}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {statusGroups.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
