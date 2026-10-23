// import Link from "next/link"; // re-enable with the hidden "Ledger entry" button
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { PaymentStatus } from "@prisma/client";
import { BuyerInvoicesView } from "@/components/shared/buyer-invoices-view";
import { FilterBar } from "@/components/shared/filter-bar";
import { MonthSelect, NativeSelect, TextInput, YearSelect } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { listBuyerEmailsByBuyerIds } from "@/lib/buyer-emails";
import { invoiceVerticalLabel } from "@/lib/invoice-lines";
import { buyerInvoiceListFilter, exportQuery } from "@/lib/invoice-list-filters";
import { formatMoney } from "@/lib/money";
import { createdByLabel } from "@/lib/invoice-audit";
import { invoiceVariance, isOverdue } from "@/lib/finance/variance";
import { getFinanceSettings } from "@/lib/finance/queries";
import { prisma } from "@/lib/prisma";
import { OPEN_BUYER_STATUSES, PAYMENT_STATUS_LABEL } from "@/lib/status";
import { listSmtpMailboxes } from "@/lib/smtp";
import { canWrite, isPublisherPortal, isTenantAdmin, requireTenant } from "@/lib/tenant";
import { num } from "@/lib/utils";

const PAGE_SIZE = 50;

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireTenant();
  if (isPublisherPortal(ctx)) redirect("/publishers");

  const settings = await getFinanceSettings(ctx.tenantId);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const { where, q, status, portal, verticalId, year, month, periodChip } = await buyerInvoiceListFilter(
    ctx,
    params,
    settings.fiscalMonthStartDay,
  );
  const writer = canWrite(ctx.tenantRole, ctx.platformRole);
  const admin = isTenantAdmin(ctx.tenantRole, ctx.platformRole);

  const [rows, total, buyers, verticals, totals, mailboxes] = await Promise.all([
    prisma.buyerInvoice.findMany({
      where,
      include: { buyer: true, vertical: true, createdBy: { select: { name: true, email: true } } },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.buyerInvoice.count({ where }),
    portal
      ? prisma.buyer.findMany({
          where: { tenantId: ctx.tenantId, id: ctx.linkedBuyerId ?? "__none__" },
          orderBy: { name: "asc" },
        })
      : prisma.buyer.findMany({ where: { tenantId: ctx.tenantId, isActive: true }, orderBy: { name: "asc" } }),
    portal
      ? Promise.resolve([] as Awaited<ReturnType<typeof prisma.vertical.findMany>>)
      : prisma.vertical.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: "asc" } }),
    prisma.buyerInvoice.aggregate({
      where,
      _sum: { receivable: true, received: true, revenue: true },
    }),
    writer ? listSmtpMailboxes(ctx.tenantId) : Promise.resolve([]),
  ]);

  const buyerIds = [...new Set(rows.map((row) => row.buyerId))];
  const invoiceIds = rows.map((row) => row.id);
  const [emailsByBuyer, linesByInvoice] = await Promise.all([
    buyerIds.length ? listBuyerEmailsByBuyerIds(ctx.tenantId, buyerIds) : Promise.resolve({} as Record<string, string[]>),
    invoiceIds.length
      ? prisma.buyerInvoiceLine.findMany({
          where: { tenantId: ctx.tenantId, buyerInvoiceId: { in: invoiceIds } },
          include: { vertical: { select: { name: true } } },
          orderBy: { sortOrder: "asc" },
        })
      : Promise.resolve([]),
  ]);
  type InvoiceLineRow = Awaited<ReturnType<typeof prisma.buyerInvoiceLine.findMany>>[number] & {
    vertical: { name: string } | null;
  };
  const linesGrouped = linesByInvoice.reduce<Record<string, InvoiceLineRow[]>>((acc, line) => {
    if (!acc[line.buyerInvoiceId]) acc[line.buyerInvoiceId] = [];
    acc[line.buyerInvoiceId].push(line);
    return acc;
  }, {});

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginationQuery: Record<string, string> = {};
  if (q) paginationQuery.q = q;
  if (status) paginationQuery.status = status;
  if (!portal && params.buyer) paginationQuery.buyer = params.buyer;
  if (verticalId) paginationQuery.vertical = verticalId;
  if (year) paginationQuery.year = String(year);
  if (month) paginationQuery.month = String(month);

  const chips = [
    q ? { key: "q", label: `Search: ${q}` } : null,
    !portal && params.buyer
      ? { key: "buyer", label: `Buyer: ${buyers.find((b) => b.id === params.buyer)?.name ?? "Selected"}` }
      : null,
    verticalId
      ? { key: "vertical", label: `Vertical: ${verticals.find((v) => v.id === verticalId)?.name ?? "Selected"}` }
      : null,
    status ? { key: "status", label: `Status: ${PAYMENT_STATUS_LABEL[status]}` } : null,
    periodChip ? { key: year ? "year" : "month", label: periodChip } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  const listRows = rows.map((row) => {
    const variance = invoiceVariance(
      row.receivable.toString(),
      row.received?.toString() ?? 0,
      settings.varianceToleranceAmount,
    );
    const lineRows = linesGrouped[row.id] ?? [];
    const verticalName =
      lineRows.length > 0
        ? invoiceVerticalLabel(
            lineRows.map((line) => ({
              verticalName: line.vertical?.name ?? null,
              leadCount: line.leadCount == null ? null : Number(line.leadCount),
              rateType: line.rateType,
              rate: line.rate == null ? null : Number(line.rate),
              amount: Number(line.amount),
              comments: line.comments,
            })),
          )
        : row.vertical?.name ?? null;
    const buyerEmails =
      emailsByBuyer[row.buyerId]?.length > 0
        ? emailsByBuyer[row.buyerId]
        : row.buyer.email
          ? [row.buyer.email]
          : [];
    return {
      id: row.id,
      buyerName: row.buyer.name,
      buyerEmails,
      verticalName,
      periodLabel: row.periodLabel,
      invoiceNumber: row.invoiceNumber,
      dueDate: row.dueDate ? row.dueDate.toISOString() : null,
      receivable: num(row.receivable),
      received: row.received == null ? null : num(row.received),
      varianceAmount: variance.amount.toNumber(),
      varianceFlagged: Boolean(row.received != null && variance.flagged),
      paymentStatus: row.paymentStatus,
      overdue: isOverdue(row.dueDate, OPEN_BUYER_STATUSES.includes(row.paymentStatus)),
      isDraft: row.isDraft,
      createdLabel: admin ? createdByLabel(row) : null,
    };
  });

  return (
    <Box>
      <PageHeader
        title={portal ? "Invoices to pay" : "Invoices"}
        description={
          portal
            ? `${total} invoice${total === 1 ? "" : "s"} for your account · ${formatMoney(num(totals._sum.receivable))} due`
            : `${total} invoice${total === 1 ? "" : "s"} · ${formatMoney(num(totals._sum.receivable))} due · ${formatMoney(num(totals._sum.received))} received`
        }
        actionHref={writer ? "/buyers/generate" : undefined}
        actionLabel={writer ? "Create invoice" : undefined}
      >
        <Button component="a" href={`/buyers/export${exportQuery(params)}`} variant="outlined" color="primary">
          Export to Excel
        </Button>
        {/* Hidden for now: "Ledger entry" records an existing / past invoice via /buyers/new.
        {writer ? (
          <Link href="/buyers/new">
            <Button variant="outlined" color="primary">
              Ledger entry
            </Button>
          </Link>
        ) : null} */}
      </PageHeader>

      <FilterBar basePath="/buyers" query={paginationQuery} chips={chips}>
        <TextInput label="Search" name="q" defaultValue={q} />
        {!portal ? (
          <NativeSelect label="Buyer" name="buyer" defaultValue={params.buyer ?? ""}>
            <option value="">All buyers</option>
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}
        <NativeSelect label="Status" name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {Object.values(PaymentStatus).map((value) => (
            <option key={value} value={value}>
              {PAYMENT_STATUS_LABEL[value]}
            </option>
          ))}
        </NativeSelect>
        {!portal ? (
          <NativeSelect label="Vertical" name="vertical" defaultValue={verticalId ?? ""}>
            <option value="">All verticals</option>
            {verticals.map((vertical) => (
              <option key={vertical.id} value={vertical.id}>
                {vertical.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}
        <YearSelect name="year" defaultValue={year ?? ""} allowEmpty />
        <MonthSelect name="month" defaultValue={month ?? ""} allowEmpty />
      </FilterBar>

      <BuyerInvoicesView
        rows={listRows}
        totals={{
          receivable: num(totals._sum.receivable),
          received: num(totals._sum.received),
        }}
        mailboxes={mailboxes}
        canManage={writer}
        canBulkDelete={admin && !portal}
      />
      <Pagination page={page} pageCount={pageCount} basePath="/buyers" query={paginationQuery} />
    </Box>
  );
}
