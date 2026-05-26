import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFilteredEmployees, getDashboardStats } from "@/services/employeeService";
import type { FilterOptions } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  const statsOnly = searchParams.get("stats") === "true";
  if (statsOnly) {
    const stats = await getDashboardStats();
    return NextResponse.json({ success: true, data: stats });
  }

  const filters: FilterOptions = {
    status: (searchParams.get("status") as FilterOptions["status"]) ?? "all",
    branch: searchParams.get("branch") ?? undefined,
    department: searchParams.get("department") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    sortBy: (searchParams.get("sortBy") as FilterOptions["sortBy"]) ?? "days_remaining",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? "asc",
    page: Number(searchParams.get("page") ?? 1),
    limit: Number(searchParams.get("limit") ?? 20),
  };

  const result = await getFilteredEmployees(filters);
  return NextResponse.json({ success: true, ...result });
}
