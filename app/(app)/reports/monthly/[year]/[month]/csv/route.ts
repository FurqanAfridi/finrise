import { NextResponse } from "next/server";
import { computeTenantMonth, loadMonthlyLines } from "@/lib/finance/queries";
import { requireTenant } from "@/lib/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const ctx = await requireTenant();
  const { year, month } = await params;
  const y = Number(year);
  const m = Number(month);
  const [{ overview, distribution }, lines] = await Promise.all([
    computeTenantMonth(ctx.tenantId, y, m),
    loadMonthlyLines(ctx.tenantId, y, m),
  ]);

  const rows = [
    ["Section", "Name", "Actual", "Paid/Received"],
    ...lines.publishers.map((row) => ["Publisher", row.name, row.actual.toFixed(2), row.paid.toFixed(2)]),
    ...lines.buyers.map((row) => ["Buyer", row.name, row.actual.toFixed(2), row.received.toFixed(2)]),
    ...lines.expenses.map((row) => ["Expense", row.label, row.actual.toFixed(2), row.paid.toFixed(2)]),
    ["Summary", "Revenue", overview.revenue.toFixed(2), ""],
    ["Summary", overview.profitLabel, overview.profit.toFixed(2), overview.marginPercent?.toFixed(2) ?? ""],
    ["Summary", "Expected profit", overview.expectedProfit.toFixed(2), ""],
    ["Summary", "Tax reserve", distribution?.taxReserve.toFixed(2) ?? "", ""],
    ["Summary", "Distributable", distribution?.afterTax.toFixed(2) ?? "", ""],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="monthly-${y}-${String(m).padStart(2, "0")}.csv"`,
    },
  });
}
