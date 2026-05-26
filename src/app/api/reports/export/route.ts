import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateReport } from "@/services/reportService";
import type { ReportOptions, ContractStatus } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  const options: ReportOptions = {
    format: (searchParams.get("format") as "csv" | "pdf") ?? "csv",
    status: (searchParams.get("status") as ContractStatus | "all") ?? "all",
    branch: searchParams.get("branch") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  };

  const { content, filename, contentType } = await generateReport(options);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
