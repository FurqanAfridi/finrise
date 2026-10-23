import { NextResponse } from "next/server";
import { reportSheets } from "@/lib/export/report-sheets";
import { xlsxResponse } from "@/lib/export/xlsx";
import { boundsForGrain, type ReportGrain } from "@/lib/finance/period";
import { computeTenantPeriod, getFinanceSettings, loadPeriodLines } from "@/lib/finance/queries";
import { requireBrokerOps } from "@/lib/tenant";

const GRAINS: ReportGrain[] = ["week", "month", "quarter", "year"];

/** Excel export of a weekly / monthly / quarterly / yearly report. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ grain: string; year: string; part: string }> },
) {
  const ctx = await requireBrokerOps();
  const { grain: grainRaw, year: yearRaw, part: partRaw } = await params;
  const grain = grainRaw as ReportGrain;
  const year = Number(yearRaw);
  const part = Number(partRaw);
  if (!GRAINS.includes(grain) || !Number.isFinite(year) || !Number.isFinite(part) || part < 1) {
    return new NextResponse("Not found", { status: 404 });
  }

  const settings = await getFinanceSettings(ctx.tenantId);
  const bounds = boundsForGrain(grain, year, part, settings.fiscalMonthStartDay);
  const [report, lines] = await Promise.all([
    computeTenantPeriod(ctx.tenantId, bounds.start, bounds.end),
    loadPeriodLines(ctx.tenantId, bounds.start, bounds.end),
  ]);
  return xlsxResponse(`report-${grain}-${year}-${String(part).padStart(2, "0")}.xlsx`, reportSheets(bounds.label, report, lines));
}
