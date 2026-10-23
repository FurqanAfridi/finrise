import type { computeTenantPeriod, loadPeriodLines } from "@/lib/finance/queries";
import { columnTotal, type ExportCell, type ExportSheet } from "@/lib/export/xlsx";

type Report = Pick<Awaited<ReturnType<typeof computeTenantPeriod>>, "overview" | "distribution" | "settings">;
type Lines = Awaited<ReturnType<typeof loadPeriodLines>>;

function breakdown(
  name: string,
  rows: { name: string; actual: number; paid: number }[],
  actualLabel: string,
  paidLabel: string,
): ExportSheet {
  const cells: ExportCell[][] = rows.map((row) => [
    row.name,
    row.actual,
    row.paid,
    Math.round((row.actual - row.paid) * 100) / 100,
  ]);
  return {
    name,
    columns: [
      { header: "Name", width: 32 },
      { header: actualLabel, format: "money" },
      { header: paidLabel, format: "money" },
      { header: "Outstanding", format: "money" },
    ],
    rows: cells,
    totals: ["Total", columnTotal(cells, 1), columnTotal(cells, 2), columnTotal(cells, 3)],
  };
}

/** Summary + buyers / publishers / expenses sheets for a report period. */
export function reportSheets(label: string, report: Report, lines: Lines): ExportSheet[] {
  const { overview, distribution, settings } = report;
  const money = (value: { toNumber(): number }) => value.toNumber();
  const summary: ExportCell[][] = [
    ["Period", label],
    ["Invoiced to buyers", money(overview.buyerInvoiced)],
    ["Money received", money(overview.buyerReceived)],
    ["Owed to publishers", money(overview.publisherOwed)],
    ["Paid to publishers", money(overview.publisherPaid)],
    ["Expenses booked", money(overview.expensesActual)],
    ["Expenses paid", money(overview.expenses)],
    ["Revenue", money(overview.revenue)],
    [overview.profitLabel || "Profit", money(overview.profit)],
    ["Margin %", overview.marginPercent == null ? null : Number(overview.marginPercent.toFixed(2))],
    ["Expected profit (invoiced)", money(overview.expectedProfit)],
    ["Cash gap", money(overview.cashGap)],
  ];
  if (distribution) {
    summary.push(
      [`Tax set aside (${settings.taxRatePercent.toNumber()}%)`, money(distribution.taxReserve)],
      ["Left to split with partners", money(distribution.afterTax)],
    );
  }

  const plain = (rows: { name?: string; label?: string; actual: { toNumber(): number }; paid?: { toNumber(): number }; received?: { toNumber(): number } }[]) =>
    rows.map((row) => ({
      name: row.name ?? row.label ?? "",
      actual: row.actual.toNumber(),
      paid: (row.paid ?? row.received)?.toNumber() ?? 0,
    }));

  return [
    {
      name: "Summary",
      columns: [
        { header: "Item", width: 32 },
        { header: "Amount", width: 18, format: "money" },
      ],
      rows: summary,
    },
    breakdown("Buyers", plain(lines.buyers), "Invoiced", "Received"),
    breakdown("Publishers", plain(lines.publishers), "Owed", "Paid"),
    breakdown("Expenses", plain(lines.expenses), "Booked", "Paid"),
  ];
}
