import { cn } from "@/lib/utils";
import type { ContractStatus } from "@/types";

const CONFIG: Record<
  ContractStatus,
  { label: string; className: string; dot: string }
> = {
  expired: {
    label: "Expired",
    className: "bg-red-100 text-red-700 border border-red-200",
    dot: "bg-red-500",
  },
  critical: {
    label: "Critical",
    className: "bg-red-50 text-red-600 border border-red-200",
    dot: "bg-red-500 animate-pulse",
  },
  urgent: {
    label: "Urgent",
    className: "bg-orange-50 text-orange-700 border border-orange-200",
    dot: "bg-orange-500",
  },
  expiring: {
    label: "Expiring Soon",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  recently_renewed: {
    label: "Renewed",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
};

interface StatusBadgeProps {
  status: ContractStatus;
  size?: "sm" | "md";
  showDot?: boolean;
}

export function StatusBadge({
  status,
  size = "md",
  showDot = true,
}: StatusBadgeProps) {
  const cfg = CONFIG[status];
  return (
    <span
      className={cn(
        "badge",
        cfg.className,
        size === "sm" && "text-[11px] px-2 py-0.5"
      )}
    >
      {showDot && (
        <span className={cn("inline-block w-1.5 h-1.5 rounded-full", cfg.dot)} />
      )}
      {cfg.label}
    </span>
  );
}
