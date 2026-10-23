import { NextResponse } from "next/server";
import { reportSheets } from "@/lib/export/report-sheets";
import { xlsxResponse } from "@/lib/export/xlsx";
import { parseYearMonth } from "@/lib/finance/period";
import { computeTenantMonth, loadMonthlyLines } from "@/lib/finance/queries";
import { requireBrokerOps } from "@/lib/tenant";
import { monthName } from "@/lib/utils";

/** Excel export of the classic monthly report (same figures as its page and CSV). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const ctx = await requireBrokerOps();
  const { year, month } = await params;
  const parsed = parseYearMonth(year, month);
  if (!parsed) return new NextResponse("Not found", { status: 404 });
  const { year: y, month: m } = parsed;
  const [report, lines] = await Promise.all([computeTenantMonth(ctx.tenantId, y, m), loadMonthlyLines(ctx.tenantId, y, m)]);
  return xlsxResponse(
    `monthly-${y}-${String(m).padStart(2, "0")}.xlsx`,
    reportSheets(`${monthName(m)} ${y}`, report, lines),
  );
}
