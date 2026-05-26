import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  description?: string;
  icon: LucideIcon;
  variant?: "default" | "danger" | "warning" | "success" | "info";
  trend?: { value: number; label: string };
}

const VARIANTS = {
  default: {
    bg: "bg-white",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    valueColor: "text-gray-900",
  },
  danger: {
    bg: "bg-white",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    valueColor: "text-red-600",
  },
  warning: {
    bg: "bg-white",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    valueColor: "text-amber-600",
  },
  success: {
    bg: "bg-white",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-600",
  },
  info: {
    bg: "bg-white",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    valueColor: "text-blue-600",
  },
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: StatsCardProps) {
  const v = VARIANTS[variant];

  return (
    <div className={cn("stat-card", v.bg)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className={cn("text-3xl font-bold mt-1", v.valueColor)}>{value}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl flex-shrink-0 ml-4", v.iconBg)}>
          <Icon className={cn("w-5 h-5", v.iconColor)} />
        </div>
      </div>
    </div>
  );
}
