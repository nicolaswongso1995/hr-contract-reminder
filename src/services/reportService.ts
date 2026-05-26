import type { Employee, ReportOptions } from "@/types";
import { formatDate, formatDaysRemaining, statusLabel } from "@/lib/utils";
import { getAllEmployees } from "./employeeService";

function applyReportFilters(
  employees: Employee[],
  options: ReportOptions
): Employee[] {
  let filtered = [...employees];

  if (options.status && options.status !== "all") {
    filtered = filtered.filter((e) => e.status === options.status);
  }
  if (options.branch) {
    filtered = filtered.filter((e) =>
      e.branch.toLowerCase().includes(options.branch!.toLowerCase())
    );
  }
  if (options.dateFrom) {
    filtered = filtered.filter(
      (e) => e.contract_end_date >= options.dateFrom!
    );
  }
  if (options.dateTo) {
    filtered = filtered.filter(
      (e) => e.contract_end_date <= options.dateTo!
    );
  }

  return filtered.sort((a, b) => a.days_remaining - b.days_remaining);
}

export function generateCsvContent(employees: Employee[]): string {
  const headers = [
    "Employee ID",
    "Name",
    "Position",
    "Department",
    "Branch",
    "Contract Start",
    "Contract End",
    "Days Remaining",
    "Status",
    "Email",
  ];

  const rows = employees.map((e) => [
    e.employee_id,
    `"${e.name}"`,
    `"${e.position}"`,
    `"${e.department}"`,
    `"${e.branch}"`,
    formatDate(e.contract_start_date),
    formatDate(e.contract_end_date),
    e.days_remaining.toString(),
    statusLabel(e.status),
    e.email,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function generateReport(
  options: ReportOptions
): Promise<{ content: string; filename: string; contentType: string }> {
  const all = await getAllEmployees();
  const filtered = applyReportFilters(all, options);

  const today = new Date().toISOString().slice(0, 10);
  const statusSuffix = options.status && options.status !== "all"
    ? `-${options.status}`
    : "";

  if (options.format === "csv") {
    return {
      content: generateCsvContent(filtered),
      filename: `hr-contracts${statusSuffix}-${today}.csv`,
      contentType: "text/csv",
    };
  }

  // PDF — return structured data; actual PDF rendering happens in the API route
  // using jsPDF on the server side
  const jsonData = JSON.stringify(
    filtered.map((e) => ({
      employee_id: e.employee_id,
      name: e.name,
      position: e.position,
      department: e.department,
      branch: e.branch,
      contract_start: formatDate(e.contract_start_date),
      contract_end: formatDate(e.contract_end_date),
      days_remaining: formatDaysRemaining(e.days_remaining),
      status: statusLabel(e.status),
    }))
  );

  return {
    content: jsonData,
    filename: `hr-contracts${statusSuffix}-${today}.json`,
    contentType: "application/json",
  };
}
