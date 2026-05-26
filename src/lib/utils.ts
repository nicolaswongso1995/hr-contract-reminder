import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  differenceInDays,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  addDays,
} from "date-fns";
import type { ContractStatus, Employee } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDaysRemaining(contractEndDate: string): number {
  const today = startOfDay(new Date());
  const endDate = startOfDay(parseISO(contractEndDate));
  return differenceInDays(endDate, today);
}

export function determineStatus(
  contractEndDate: string,
  contractStartDate: string
): ContractStatus {
  const today = startOfDay(new Date());
  const endDate = startOfDay(parseISO(contractEndDate));
  const startDate = startOfDay(parseISO(contractStartDate));
  const daysRemaining = differenceInDays(endDate, today);
  const daysSinceStart = differenceInDays(today, startDate);

  if (isBefore(endDate, today)) return "expired";
  if (daysRemaining <= 7)       return "critical";
  if (daysRemaining <= 14)      return "urgent";
  if (daysRemaining <= 30)      return "expiring";

  // Recently renewed = contract started within the last 30 days
  if (daysSinceStart <= 30 && isAfter(endDate, today)) return "recently_renewed";

  return "active";
}

export function enrichEmployee(
  employee: Omit<Employee, "days_remaining" | "status">
): Employee {
  const days = calculateDaysRemaining(employee.contract_end_date);
  const status = determineStatus(
    employee.contract_end_date,
    employee.contract_start_date
  );
  return { ...employee, days_remaining: days, status };
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy, HH:mm");
  } catch {
    return dateStr;
  }
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function isExpiringOnDay(
  contractEndDate: string,
  daysBeforeExpiry: number
): boolean {
  const today = startOfDay(new Date());
  const targetDate = addDays(today, daysBeforeExpiry);
  const endDate = startOfDay(parseISO(contractEndDate));
  return differenceInDays(endDate, today) === daysBeforeExpiry;
}

export function statusLabel(status: ContractStatus): string {
  const labels: Record<ContractStatus, string> = {
    expired: "Expired",
    critical: "Critical",
    urgent: "Urgent",
    expiring: "Expiring Soon",
    active: "Active",
    recently_renewed: "Recently Renewed",
  };
  return labels[status];
}

export function statusColor(status: ContractStatus): string {
  const colors: Record<ContractStatus, string> = {
    expired: "red",
    critical: "red",
    urgent: "orange",
    expiring: "yellow",
    active: "green",
    recently_renewed: "blue",
  };
  return colors[status];
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit),
  };
}
