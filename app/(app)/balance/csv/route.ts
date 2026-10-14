import { NextResponse } from "next/server";
import { isoDate } from "@/lib/dates";
import { buildCashLedger, CASH_LEDGER_KIND_LABEL, parseCashLedgerParams } from "@/lib/finance/cash-ledger";
import { getCashOpening, loadCashLedgerEntries } from "@/lib/finance/queries";
import { requireBrokerOps } from "@/lib/tenant";

/** Quote a cell; text that Excel would read as a formula gets a leading apostrophe. */
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) && !/^-?\d+(\.\d+)?$/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const ctx = await requireBrokerOps();
  const filters = parseCashLedgerParams(Object.fromEntries(new URL(request.url).searchParams));
  const [entries, { opening, openingDate }] = await Promise.all([
    loadCashLedgerEntries(ctx.tenantId),
    getCashOpening(ctx.tenantId),
  ]);
  const ledger = buildCashLedger(entries, {
    opening,
    openingDate,
    from: filters.from,
    to: filters.to,
    kinds: filters.kind ? [filters.kind] : undefined,
  });

  const rows: string[][] = [["Date", "Type", "Description", "Reference", "Money in", "Money out", "Balance"]];
  if (filters.from || !ledger.broughtForward.eq(0)) {
    rows.push([
      isoDate(filters.from ?? openingDate),
      filters.from ? "Brought forward" : "Opening balance",
      "",
      "",
      "",
      "",
      ledger.broughtForward.toFixed(2),
    ]);
  }
  for (const row of ledger.rows) {
    rows.push([
      isoDate(row.date),
      CASH_LEDGER_KIND_LABEL[row.kind],
      row.description,
      row.reference ?? "",
      row.moneyIn.gt(0) ? row.moneyIn.toFixed(2) : "",
      row.moneyOut.gt(0) ? row.moneyOut.toFixed(2) : "",
      row.balance.toFixed(2),
    ]);
  }
  rows.push(["", "Totals", "", "", ledger.totalIn.toFixed(2), ledger.totalOut.toFixed(2), ledger.closingBalance.toFixed(2)]);

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const range = [filters.fromValue, filters.toValue].filter(Boolean).join("_to_");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="balance${range ? `-${range}` : ""}.csv"`,
    },
  });
}
