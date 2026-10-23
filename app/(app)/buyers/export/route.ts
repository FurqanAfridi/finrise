import { NextResponse, type NextRequest } from "next/server";
import { columnTotal, exportFilename, xlsxResponse, type ExportCell } from "@/lib/export/xlsx";
import { getFinanceSettings } from "@/lib/finance/queries";
import { buyerInvoiceListFilter } from "@/lib/invoice-list-filters";
import { prisma } from "@/lib/prisma";
import { INVOICE_STATUS_LABEL, PAYMENT_STATUS_LABEL, RATE_TYPE_LABEL } from "@/lib/status";
import { isPublisherPortal, requireTenant } from "@/lib/tenant";

const amount = (value: unknown) => (value == null ? null : Number(value));

/** Excel export of the buyer invoices list, using the same filters as the page. */
export async function GET(request: NextRequest) {
  const ctx = await requireTenant();
  if (isPublisherPortal(ctx)) return new NextResponse("Not found", { status: 404 });

  const settings = await getFinanceSettings(ctx.tenantId);
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const { where } = await buyerInvoiceListFilter(ctx, params, settings.fiscalMonthStartDay);

  const invoices = await prisma.buyerInvoice.findMany({
    where,
    include: {
      buyer: { select: { name: true } },
      vertical: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      lines: { include: { vertical: { select: { name: true } } }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
  });

  const invoiceRows: ExportCell[][] = [];
  const lineRows: ExportCell[][] = [];
  for (const invoice of invoices) {
    const receivable = Number(invoice.receivable);
    const received = amount(invoice.received);
    const verticals =
      invoice.lines.length > 0
        ? invoice.lines.map((line) => line.vertical?.name ?? "None").join(", ")
        : (invoice.vertical?.name ?? "");
    invoiceRows.push([
      invoice.invoiceNumber,
      invoice.buyer.name,
      verticals,
      invoice.periodLabel,
      invoice.periodStart,
      invoice.periodEnd,
      invoice.invoiceDate,
      invoice.dueDate,
      Number(invoice.revenue),
      receivable,
      received,
      Math.round((receivable - (received ?? 0)) * 100) / 100,
      PAYMENT_STATUS_LABEL[invoice.paymentStatus],
      INVOICE_STATUS_LABEL[invoice.invoiceStatus],
      invoice.terms,
      invoice.paidAt,
      invoice.paymentMethod,
      invoice.comments,
      invoice.createdBy?.name ?? invoice.createdBy?.email ?? "",
    ]);

    // Older invoices have no line rows; their header fields are the single line.
    const lines =
      invoice.lines.length > 0
        ? invoice.lines
        : [{ ...invoice, amount: invoice.revenue, vertical: invoice.vertical }];
    for (const line of lines) {
      lineRows.push([
        invoice.invoiceNumber,
        invoice.buyer.name,
        invoice.periodLabel,
        line.vertical?.name ?? "",
        amount(line.leadCount),
        RATE_TYPE_LABEL[line.rateType],
        amount(line.rate),
        Number(line.amount),
        line.comments,
      ]);
    }
  }

  return xlsxResponse(exportFilename("invoices"), [
    {
      name: "Invoices",
      columns: [
        { header: "Invoice #", width: 16 },
        { header: "Buyer", width: 24 },
        { header: "Verticals", width: 28 },
        { header: "Date range", width: 18 },
        { header: "Period start", format: "date" },
        { header: "Period end", format: "date" },
        { header: "Invoice date", format: "date" },
        { header: "Due date", format: "date" },
        { header: "Revenue", format: "money" },
        { header: "Receivable", format: "money" },
        { header: "Received", format: "money" },
        { header: "Balance", format: "money" },
        { header: "Payment status", width: 16 },
        { header: "Invoice status", width: 14 },
        { header: "Terms", width: 12 },
        { header: "Paid at", format: "date" },
        { header: "Payment method", width: 16 },
        { header: "Comments", width: 30 },
        { header: "Created by", width: 20 },
      ],
      rows: invoiceRows,
      totals: [
        "Total",
        `${invoiceRows.length} invoices`,
        null,
        null,
        null,
        null,
        null,
        null,
        columnTotal(invoiceRows, 8),
        columnTotal(invoiceRows, 9),
        columnTotal(invoiceRows, 10),
        columnTotal(invoiceRows, 11),
      ],
    },
    {
      name: "Lines by vertical",
      columns: [
        { header: "Invoice #", width: 16 },
        { header: "Buyer", width: 24 },
        { header: "Date range", width: 18 },
        { header: "Vertical", width: 22 },
        { header: "Quantity", format: "count" },
        { header: "Rate type", width: 12 },
        { header: "Rate", format: "rate" },
        { header: "Amount", format: "money" },
        { header: "Description", width: 30 },
      ],
      rows: lineRows,
      totals: ["Total", null, null, null, null, null, null, columnTotal(lineRows, 7)],
    },
  ]);
}
