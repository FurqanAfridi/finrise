import { PaymentStatus, Prisma } from "@prisma/client";
import { listPeriodFilter, periodChipLabel, yearSpan } from "@/lib/finance/period";
import { prisma } from "@/lib/prisma";
import {
  isBuyerPortal,
  isPublisherPortal,
  scopedBuyerFilter,
  scopedPublisherFilter,
  type TenantContext,
} from "@/lib/tenant";

type ListParams = Record<string, string | undefined>;

/** Prisma ignores an empty object inside AND, so unused filters stay `{}`. */
function search(q: string, contact: "buyer" | "publisher") {
  if (!q) return {};
  return {
    OR: [
      { invoiceNumber: { contains: q, mode: "insensitive" as const } },
      { periodLabel: { contains: q, mode: "insensitive" as const } },
      { [contact]: { name: { contains: q, mode: "insensitive" as const } } },
    ],
  };
}

/** Filters for the buyer invoices list, shared by the page and its Excel export. */
export async function buyerInvoiceListFilter(ctx: TenantContext, params: ListParams, fiscalMonthStartDay: number) {
  const q = params.q?.trim() ?? "";
  const status = params.status as PaymentStatus | undefined;
  const portal = isBuyerPortal(ctx);
  const buyerId = scopedBuyerFilter(ctx, params.buyer);
  const verticalId = portal ? undefined : params.vertical;
  const year = params.year ? Number(params.year) : undefined;
  const month = params.month ? Number(params.month) : undefined;

  const dateRange =
    month && !year
      ? await prisma.buyerInvoice.aggregate({
          where: { tenantId: ctx.tenantId },
          _min: { periodStart: true, dueDate: true },
          _max: { periodStart: true, dueDate: true },
        })
      : null;
  const dataYears = dateRange
    ? yearSpan(dateRange._min.periodStart, dateRange._min.dueDate, dateRange._max.periodStart, dateRange._max.dueDate)
    : [];

  const where: Prisma.BuyerInvoiceWhereInput = {
    tenantId: ctx.tenantId,
    AND: [
      listPeriodFilter(year, month, dataYears, fiscalMonthStartDay),
      search(q, "buyer"),
      status ? { paymentStatus: status } : {},
      buyerId ? { buyerId } : {},
      verticalId ? { OR: [{ verticalId }, { lines: { some: { verticalId } } }] } : {},
    ],
  };

  return { where, q, status, portal, buyerId, verticalId, year, month, periodChip: periodChipLabel(year, month) };
}

/** Filters for the publisher payables list, shared by the page and its Excel export. */
export async function publisherInvoiceListFilter(
  ctx: TenantContext,
  params: ListParams,
  fiscalMonthStartDay: number,
) {
  const q = params.q?.trim() ?? "";
  const status = params.status as PaymentStatus | undefined;
  const portal = isPublisherPortal(ctx);
  const publisherId = scopedPublisherFilter(ctx, params.publisher);
  const verticalId = portal ? undefined : params.vertical;
  const year = params.year ? Number(params.year) : undefined;
  const month = params.month ? Number(params.month) : undefined;
  const week = portal ? "" : (params.week?.trim() ?? "");

  const dateRange =
    month && !year
      ? await prisma.publisherInvoice.aggregate({
          where: { tenantId: ctx.tenantId },
          _min: { periodStart: true, dueDate: true },
          _max: { periodStart: true, dueDate: true },
        })
      : null;
  const dataYears = dateRange
    ? yearSpan(dateRange._min.periodStart, dateRange._min.dueDate, dateRange._max.periodStart, dateRange._max.dueDate)
    : [];

  const where: Prisma.PublisherInvoiceWhereInput = {
    tenantId: ctx.tenantId,
    AND: [
      listPeriodFilter(year, month, dataYears, fiscalMonthStartDay),
      search(q, "publisher"),
      week ? { weekLabel: { contains: week, mode: "insensitive" as const } } : {},
      status ? { paymentStatus: status } : {},
      publisherId ? { publisherId } : {},
      verticalId ? { OR: [{ verticalId }, { lines: { some: { verticalId } } }] } : {},
    ],
  };

  return {
    where,
    q,
    status,
    portal,
    publisherId,
    verticalId,
    year,
    month,
    week,
    periodChip: periodChipLabel(year, month),
  };
}

/** The list's current filters as a query string for the export link (page number dropped). */
export function exportQuery(params: ListParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}
