import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import { PaidApprovalStatus, PaymentStatus } from "@prisma/client";
import { FilterBar } from "@/components/shared/filter-bar";
import { PublisherInvoicesView } from "@/components/shared/publisher-invoices-view";
import { NativeSelect, TextInput } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { monthPeriodFilter } from "@/lib/finance/period";
import { getFinanceSettings } from "@/lib/finance/queries";
import { invoiceVariance } from "@/lib/finance/variance";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PAYMENT_STATUS_LABEL } from "@/lib/status";
import {
  canApprovePayments,
  canWrite,
  isBuyerPortal,
  isPublisherPortal,
  requireTenant,
  scopedPublisherFilter,
} from "@/lib/tenant";
import { num } from "@/lib/utils";

const PAGE_SIZE = 50;

export default async function PublishersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireTenant();
  if (isBuyerPortal(ctx)) redirect("/buyers");

  const settings = await getFinanceSettings(ctx.tenantId);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q?.trim() ?? "";
  const status = params.status as PaymentStatus | undefined;
  const portal = isPublisherPortal(ctx);
  const publisherId = scopedPublisherFilter(ctx, params.publisher);
  const verticalId = portal ? undefined : params.vertical;
  const year = params.year ? Number(params.year) : undefined;
  const month = params.month ? Number(params.month) : undefined;
  const week = portal ? "" : (params.week?.trim() ?? "");
  const dateFilter = year && month ? monthPeriodFilter(year, month, settings.fiscalMonthStartDay) : {};
  const approver = canApprovePayments(ctx.tenantRole, ctx.platformRole);
  const writer = canWrite(ctx.tenantRole, ctx.platformRole);

  const where = {
    tenantId: ctx.tenantId,
    AND: [
      dateFilter,
      q
        ? {
            OR: [
              { invoiceNumber: { contains: q, mode: "insensitive" as const } },
              { periodLabel: { contains: q, mode: "insensitive" as const } },
              { publisher: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {},
      week ? { weekLabel: { contains: week, mode: "insensitive" as const } } : {},
      status ? { paymentStatus: status } : {},
      publisherId ? { publisherId } : {},
      verticalId ? { verticalId } : {},
    ],
  };

  const [rows, total, publishers, verticals, totals] = await Promise.all([
    prisma.publisherInvoice.findMany({
      where,
      include: { publisher: true, vertical: true },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.publisherInvoice.count({ where }),
    portal
      ? prisma.publisher.findMany({
          where: { tenantId: ctx.tenantId, id: ctx.linkedPublisherId ?? "__none__" },
          orderBy: { name: "asc" },
        })
      : prisma.publisher.findMany({ where: { tenantId: ctx.tenantId, isActive: true }, orderBy: { name: "asc" } }),
    portal
      ? Promise.resolve([] as Awaited<ReturnType<typeof prisma.vertical.findMany>>)
      : prisma.vertical.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: "asc" } }),
    prisma.publisherInvoice.aggregate({
      where,
      _sum: { payable: true, paid: true, amount: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginationQuery: Record<string, string> = {};
  if (q) paginationQuery.q = q;
  if (status) paginationQuery.status = status;
  if (!portal && params.publisher) paginationQuery.publisher = params.publisher;
  if (verticalId) paginationQuery.vertical = verticalId;
  if (year) paginationQuery.year = String(year);
  if (month) paginationQuery.month = String(month);
  if (week) paginationQuery.week = week;

  const chips = [
    q ? { key: "q", label: `Search: ${q}` } : null,
    !portal && params.publisher
      ? {
          key: "publisher",
          label: `Publisher: ${publishers.find((p) => p.id === params.publisher)?.name ?? "Selected"}`,
        }
      : null,
    verticalId
      ? { key: "vertical", label: `Vertical: ${verticals.find((v) => v.id === verticalId)?.name ?? "Selected"}` }
      : null,
    status ? { key: "status", label: `Status: ${PAYMENT_STATUS_LABEL[status]}` } : null,
    week ? { key: "week", label: `Week: ${week}` } : null,
    year && month ? { key: "month", label: `Period: ${month}/${year}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  const listRows = rows.map((row) => {
    const variance = invoiceVariance(row.payable.toString(), row.paid?.toString() ?? 0, settings.varianceToleranceAmount);
    return {
      id: row.id,
      publisherName: row.publisher.name,
      isInternal: row.publisher.isInternal,
      verticalName: row.vertical?.name ?? null,
      periodLabel: row.periodLabel || row.monthLabel,
      invoiceNumber: row.invoiceNumber,
      dueDate: row.dueDate ? row.dueDate.toISOString() : null,
      payable: num(row.payable),
      paid: row.paid == null ? null : num(row.paid),
      varianceAmount: variance.amount.toNumber(),
      varianceFlagged: Boolean(row.paid != null && variance.flagged),
      paymentStatus: row.paymentStatus,
      paidApprovalStatus: row.paidApprovalStatus as PaidApprovalStatus | null,
    };
  });

  return (
    <Box>
      <PageHeader
        title={portal ? "My invoices" : "Publisher payables"}
        description={
          portal
            ? `${total} invoice${total === 1 ? "" : "s"} for your account · ${formatMoney(num(totals._sum.payable))} owed`
            : `${total} payable${total === 1 ? "" : "s"} · ${formatMoney(num(totals._sum.payable))} owed · ${formatMoney(num(totals._sum.paid))} paid`
        }
        actionHref={writer || portal ? "/publishers/new" : undefined}
        actionLabel={portal ? "Create invoice" : writer ? "New payable" : undefined}
      />

      <FilterBar basePath="/publishers" query={paginationQuery} chips={chips}>
        <TextInput label="Search" name="q" defaultValue={q} />
        {!portal ? (
          <NativeSelect label="Publisher" name="publisher" defaultValue={params.publisher ?? ""}>
            <option value="">All publishers</option>
            {publishers.map((publisher) => (
              <option key={publisher.id} value={publisher.id}>
                {publisher.name}
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
        <TextInput label="Year" name="year" defaultValue={year ?? ""} kind="int" min={1990} max={2100} />
        <TextInput label="Month" name="month" defaultValue={month ?? ""} kind="int" min={1} max={12} />
        {!portal ? <TextInput label="Week" name="week" defaultValue={week} maxLength={40} /> : null}
      </FilterBar>

      <PublisherInvoicesView
        rows={listRows}
        totals={{
          payable: num(totals._sum.payable),
          paid: num(totals._sum.paid),
        }}
        canApprove={approver}
        canManage={writer}
        isPortal={portal}
      />
      <Pagination page={page} pageCount={pageCount} basePath="/publishers" query={paginationQuery} />
    </Box>
  );
}
