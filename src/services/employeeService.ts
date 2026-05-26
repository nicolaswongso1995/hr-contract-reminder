import { mockEmployees, BRANCHES, DEPARTMENTS } from "@/lib/mock-data";
import { enrichEmployee, paginate } from "@/lib/utils";
import type { Employee, FilterOptions, DashboardStats } from "@/types";
import {
  differenceInDays,
  parseISO,
  startOfDay,
  isAfter,
  isBefore,
  addDays,
} from "date-fns";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

async function fetchFromDatabase(): Promise<Employee[]> {
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("contract_end_date", { ascending: true });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return (data ?? []).map((e) => enrichEmployee(e));
}

export async function getAllEmployees(): Promise<Employee[]> {
  if (USE_MOCK) return mockEmployees;
  return fetchFromDatabase();
}

export async function getFilteredEmployees(filters: FilterOptions): Promise<{
  data: Employee[];
  total: number;
  page: number;
  limit: number;
}> {
  let employees = await getAllEmployees();
  const { status, branch, department, search, sortBy, sortOrder, page = 1, limit = 20 } = filters;

  if (status && status !== "all") {
    employees = employees.filter((e) => e.status === status);
  }
  if (branch) {
    employees = employees.filter((e) =>
      e.branch.toLowerCase().includes(branch.toLowerCase())
    );
  }
  if (department) {
    employees = employees.filter((e) =>
      e.department.toLowerCase().includes(department.toLowerCase())
    );
  }
  if (search) {
    const q = search.toLowerCase();
    employees = employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
    );
  }

  // Sort
  employees.sort((a, b) => {
    const dir = sortOrder === "desc" ? -1 : 1;
    switch (sortBy) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "days_remaining":
        return dir * (a.days_remaining - b.days_remaining);
      case "contract_end_date":
        return dir * a.contract_end_date.localeCompare(b.contract_end_date);
      case "status": {
        const order = ["expired", "critical", "urgent", "expiring", "active", "recently_renewed"];
        return dir * (order.indexOf(a.status) - order.indexOf(b.status));
      }
      default:
        return a.days_remaining - b.days_remaining;
    }
  });

  const result = paginate(employees, page, limit);
  return { data: result.data, total: result.total, page, limit };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const employees = await getAllEmployees();
  const today = startOfDay(new Date());
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);

  return {
    total_employees: employees.length,
    already_expired: employees.filter((e) =>
      isBefore(parseISO(e.contract_end_date), today)
    ).length,
    expiring_this_week: employees.filter((e) => {
      const end = parseISO(e.contract_end_date);
      return isAfter(end, today) && isBefore(end, in7);
    }).length,
    expiring_this_month: employees.filter((e) => {
      const end = parseISO(e.contract_end_date);
      return isAfter(end, today) && isBefore(end, in30);
    }).length,
    recently_renewed: employees.filter((e) => e.status === "recently_renewed").length,
    active_contracts: employees.filter((e) => e.status === "active").length,
  };
}

export async function getEmployeesExpiringIn(days: number): Promise<Employee[]> {
  const employees = await getAllEmployees();
  return employees.filter(
    (e) => e.days_remaining === days || e.days_remaining === 0
  );
}

export async function upsertEmployees(
  employees: Omit<Employee, "days_remaining" | "status">[]
): Promise<void> {
  if (USE_MOCK) {
    console.log(`[Mock] Would upsert ${employees.length} employees`);
    return;
  }
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = await createServiceClient();
  const { error } = await supabase.from("employees").upsert(employees, {
    onConflict: "employee_id",
  });
  if (error) throw new Error(`Upsert failed: ${error.message}`);
}

export { BRANCHES, DEPARTMENTS };
