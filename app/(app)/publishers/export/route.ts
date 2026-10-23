import { NextResponse, type NextRequest } from "next/server";
import { PaidApprovalStatus } from "@prisma/client";
import { columnTotal, exportFilename, xlsxResponse, type ExportCell } from "@/lib/export/xlsx";
import { getFinanceSettings } from "@/lib/finance/queries";
import { publisherInvoiceListFilter } from "@/lib/invoice-list-filters";
import { prisma } from "@/lib/prisma";
import { PAYMENT_STATUS_LABEL, RATE_TYPE_LABEL } from "@/lib/status";
import { isBuyerPortal, requireTenant } from "@/lib/tenant";

const amount = (value: unknown) => (value == null ? null : Number(value));

const APPROVAL_LABEL: Record<PaidApprovalStatus, string> = {
  NOT_REQUIRED: "",
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** Excel export of the publisher payables list, using the same filters as the page. */
export async function GET(request: NextRequest) {
  const ctx = await requireTenant();
  if (isBuyerPortal(ctx)) return new NextResponse("Not found", { status: 404 });

  const settings = await getFinanceSettings(ctx.tenantId);
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const { where } = await publisherInvoiceListFilter(ctx, params, settings.fiscalMonthStartDay);

  const invoices = await prisma.publisherInvoice.findMany({
    where,
    include: {
      publisher: { select: { name: true } },
      vertical: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      lines: { include: { vertical: { select: { name: true } } }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
  });

  const invoiceRows: ExportCell[][] = [];
  const lineRows: ExportCell[][] = [];
  for (const invoice of invoices) {
    const payable = Number(invoice.payable);
    const paid = amount(invoice.paid);
    const verticals =
      invoice.lines.length > 0
        ? invoice.lines.map((line) => line.vertical?.name ?? "None").join(", ")
        : (invoice.vertical?.name ?? "");
    invoiceRows.push([
      invoice.invoiceNumber,
      invoice.publisher.name,
      verticals,
      invoice.periodLabel || invoice.monthLabel,
      invoice.weekLabel,
      invoice.periodStart,
      invoice.periodEnd,
      invoice.invoiceDate,
      invoice.dueDate,
      Number(invoice.amount),
      payable,
      paid,
      Math.round((payable - (paid ?? 0)) * 100) / 100,
      amount(invoice.transactionAmount),
      PAYMENT_STATUS_LABEL[invoice.paymentStatus],
      APPROVAL_LABEL[invoice.paidApprovalStatus],
      invoice.terms,
      invoice.paidAt,
      invoice.paymentMethod,
      invoice.createdBy?.name ?? invoice.createdBy?.email ?? "",
    ]);

    // Older payables have no line rows; their header fields are the single line.
    const lines =
      invoice.lines.length > 0 ? invoice.lines : [{ ...invoice, comments: null, vertical: invoice.vertical }];
    for (const line of lines) {
      lineRows.push([
        invoice.invoiceNumber,
        invoice.publisher.name,
        invoice.periodLabel || invoice.monthLabel,
        line.vertical?.name ?? "",
        amount(line.leadCount),
        RATE_TYPE_LABEL[line.rateType],
        amount(line.rate),
        Number(line.amount),
        line.comments,
      ]);
    }
  }

  return xlsxResponse(exportFilename("payables"), [
    {
      name: "Payables",
      columns: [
        { header: "Invoice #", width: 16 },
        { header: "Publisher", width: 24 },
        { header: "Verticals", width: 28 },
        { header: "Date range", width: 18 },
        { header: "Week", width: 12 },
        { header: "Period start", format: "date" },
        { header: "Period end", format: "date" },
        { header: "Invoice date", format: "date" },
        { header: "Due date", format: "date" },
        { header: "Amount", format: "money" },
        { header: "You owe", format: "money" },
        { header: "Paid", format: "money" },
        { header: "Balance", format: "money" },
        { header: "Transaction amount", format: "money", width: 18 },
        { header: "Payment status", width: 16 },
        { header: "Approval", width: 16 },
        { header: "Terms", width: 12 },
        { header: "Paid at", format: "date" },
        { header: "Payment method", width: 16 },
        { header: "Created by", width: 20 },
      ],
      rows: invoiceRows,
      totals: [
        "Total",
        `${invoiceRows.length} payables`,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        columnTotal(invoiceRows, 9),
        columnTotal(invoiceRows, 10),
        columnTotal(invoiceRows, 11),
        columnTotal(invoiceRows, 12),
        columnTotal(invoiceRows, 13),
      ],
    },
    {
      name: "Lines by vertical",
      columns: [
        { header: "Invoice #", width: 16 },
        { header: "Publisher", width: 24 },
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
