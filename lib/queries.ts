import { Prisma } from "@prisma/client";
import { addUtcDays, diffUtcDays, utcDay } from "@/lib/billing-cycle";
import { cents } from "@/lib/finance/decimal";
import { getFinanceSettings, overallProfit } from "@/lib/finance/queries";
import { invoiceVariance } from "@/lib/finance/variance";
import { formatMoney } from "@/lib/money";
import { isoDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { OPEN_BUYER_STATUSES, OPEN_PUBLISHER_STATUSES } from "@/lib/status";
import { monthName } from "@/lib/utils";
import { ensurePpcVerticals } from "@/lib/verticals";

function n(value: Prisma.Decimal | number | null | undefined) {
  return cents(value?.toString() ?? 0).toNumber();
}

export type AttentionPill =
  | "overdue"
  | "draft"
  | "pending_approval"
  | "unbilled"
  | "variance"
  | "missing"
  | "due_soon"
  | "paid";

export type AttentionItem = {
  id: string;
  href: string;
  title: string;
  detail: string;
  amount: number | null;
  pill: AttentionPill;
};

export async function getSetting(tenantId: string, key: string, fallback = "") {
  const row = await prisma.setting.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });
  return row?.value ?? fallback;
}

export async function getDashboardStats(tenantId: string) {
  const openBuyerWhere = {
    tenantId,
    isDraft: false,
    paymentStatus: { in: OPEN_BUYER_STATUSES },
  };
  const openPublisherWhere = {
    tenantId,
    isDraft: false,
    paymentStatus: { in: OPEN_PUBLISHER_STATUSES },
  };

  const [
    profit,
    unpaidBuyers,
    unpaidPublishers,
    overdueBuyers,
    overduePublishers,
    pendingApprovals,
    unbilledBuyers,
    unbilledPublishers,
    draftBuyers,
    draftPublishers,
  ] = await Promise.all([
    overallProfit(tenantId),
    prisma.buyerInvoice.aggregate({
      where: openBuyerWhere,
      _sum: { receivable: true, received: true },
      _count: true,
    }),
    prisma.publisherInvoice.aggregate({
      where: openPublisherWhere,
      _sum: { payable: true, paid: true },
      _count: true,
    }),
    prisma.buyerInvoice.aggregate({
      where: { ...openBuyerWhere, dueDate: { lt: new Date() } },
      _sum: { receivable: true, received: true },
      _count: true,
    }),
    prisma.publisherInvoice.aggregate({
      where: { ...openPublisherWhere, dueDate: { lt: new Date() } },
      _sum: { payable: true, paid: true },
      _count: true,
    }),
    prisma.publisherInvoice.count({
      where: { tenantId, paidApprovalStatus: "PENDING" },
    }),
    prisma.buyerDailyFigure.aggregate({
      where: { tenantId, buyerInvoiceId: null },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.publisherDailyFigure.aggregate({
      where: { tenantId, publisherInvoiceId: null },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.buyerInvoice.count({ where: { tenantId, isDraft: true } }),
    prisma.publisherInvoice.count({ where: { tenantId, isDraft: true } }),
  ]);

  const latest = profit.series[0];
  const ar = n(unpaidBuyers._sum.receivable) - n(unpaidBuyers._sum.received);
  const ap = n(unpaidPublishers._sum.payable) - n(unpaidPublishers._sum.paid);
  const trend = profit.series.slice(0, 12).reverse().map((row) => ({
    label: `${monthName(row.month).slice(0, 3)} ${String(row.year).slice(2)}`,
    year: row.year,
    month: row.month,
    received: row.overview.buyerReceived.toNumber(),
    paidOut: row.overview.publisherPaid.toNumber() + row.overview.expensesPaid.toNumber(),
    invoiced: row.overview.buyerInvoiced.toNumber(),
    expenses: row.overview.expensesPaid.toNumber(),
    publisherPaid: row.overview.publisherPaid.toNumber(),
    profit: row.overview.profit.toNumber(),
  }));

  return {
    ar: Math.max(ar, 0),
    ap: Math.max(ap, 0),
    openBuyerCount: unpaidBuyers._count,
    openPublisherCount: unpaidPublishers._count,
    overdueAr: Math.max(n(overdueBuyers._sum.receivable) - n(overdueBuyers._sum.received), 0),
    overdueCount: overdueBuyers._count,
    overdueAp: Math.max(n(overduePublishers._sum.payable) - n(overduePublishers._sum.paid), 0),
    overduePublisherCount: overduePublishers._count,
    pendingApprovals,
    unbilledBuyerAmount: n(unbilledBuyers._sum.amount),
    unbilledBuyerCount: unbilledBuyers._count,
    unbilledPublisherAmount: n(unbilledPublishers._sum.amount),
    unbilledPublisherCount: unbilledPublishers._count,
    draftCount: draftBuyers + draftPublishers,
    profit: profit.totalSavings.toNumber(),
    latest,
    trend,
  };
}

function daysPastDue(dueDate: Date | null | undefined, now = new Date()) {
  if (!dueDate) return 0;
  return Math.max(0, diffUtcDays(dueDate, now));
}

function daysUntil(dueDate: Date | null | undefined, now = new Date()) {
  if (!dueDate) return 0;
  return Math.max(0, diffUtcDays(now, dueDate));
}

function joinDetail(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

/** Short “needs attention” lists for the dashboard (progressive disclosure). */
export async function getDashboardAttention(tenantId: string) {
  const now = new Date();
  const today = utcDay(now);
  const yesterday = addUtcDays(today, -1);
  const in7 = addUtcDays(today, 7);
  const settings = await getFinanceSettings(tenantId);

  const [
    overdueBuyers,
    overduePublishers,
    draftBuyers,
    draftPublishers,
    pendingApprovals,
    recentBuyerPaid,
    recentPublisherPaid,
    dueSoonBuyers,
    dueSoonPublishers,
    loggerBuyers,
    loggerPublishers,
    yesterdayBuyerFigures,
    yesterdayPublisherFigures,
  ] = await Promise.all([
    prisma.buyerInvoice.findMany({
      where: {
        tenantId,
        isDraft: false,
        paymentStatus: { in: OPEN_BUYER_STATUSES },
        dueDate: { lt: now },
      },
      include: { buyer: { select: { name: true } }, vertical: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.publisherInvoice.findMany({
      where: {
        tenantId,
        isDraft: false,
        paymentStatus: { in: OPEN_PUBLISHER_STATUSES },
        dueDate: { lt: now },
      },
      include: { publisher: { select: { name: true } }, vertical: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.buyerInvoice.findMany({
      where: { tenantId, isDraft: true },
      include: { buyer: { select: { name: true } }, vertical: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.publisherInvoice.findMany({
      where: { tenantId, isDraft: true },
      include: { publisher: { select: { name: true } }, vertical: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.publisherInvoice.findMany({
      where: { tenantId, paidApprovalStatus: "PENDING" },
      include: { publisher: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.buyerInvoice.findMany({
      where: { tenantId, isDraft: false, received: { not: null } },
      include: { buyer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.publisherInvoice.findMany({
      where: { tenantId, isDraft: false, paid: { not: null } },
      include: { publisher: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.buyerInvoice.findMany({
      where: {
        tenantId,
        isDraft: false,
        paymentStatus: { in: OPEN_BUYER_STATUSES },
        dueDate: { gte: today, lte: in7 },
      },
      include: { buyer: { select: { name: true } }, vertical: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.publisherInvoice.findMany({
      where: {
        tenantId,
        isDraft: false,
        paymentStatus: { in: OPEN_PUBLISHER_STATUSES },
        dueDate: { gte: today, lte: in7 },
      },
      include: { publisher: { select: { name: true } }, vertical: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.buyer.findMany({
      where: {
        tenantId,
        isActive: true,
        contractStartDate: { lte: yesterday },
        verticalOffers: { some: {} },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.publisher.findMany({
      where: {
        tenantId,
        isActive: true,
        contractStartDate: { lte: yesterday },
        verticalOffers: { some: {} },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.buyerDailyFigure.findMany({
      where: { tenantId, figureDate: yesterday },
      distinct: ["buyerId"],
      select: { buyerId: true },
    }),
    prisma.publisherDailyFigure.findMany({
      where: { tenantId, figureDate: yesterday },
      distinct: ["publisherId"],
      select: { publisherId: true },
    }),
  ]);

  const overdue: AttentionItem[] = [
    ...overdueBuyers.map((row) => {
      const days = daysPastDue(row.dueDate, now);
      return {
        id: row.id,
        href: `/buyers/${row.id}`,
        title: row.buyer.name,
        detail: joinDetail(
          row.invoiceNumber || "Invoice",
          row.vertical?.name,
          days === 1 ? "1 day past due" : `${days} days past due`,
        ),
        amount: Math.max(n(row.receivable) - n(row.received), 0),
        pill: "overdue" as const,
      };
    }),
    ...overduePublishers.map((row) => {
      const days = daysPastDue(row.dueDate, now);
      return {
        id: row.id,
        href: `/publishers/${row.id}`,
        title: row.publisher.name,
        detail: joinDetail(
          row.invoiceNumber || "Payable",
          row.vertical?.name,
          days === 1 ? "1 day past due" : `${days} days past due`,
        ),
        amount: Math.max(n(row.payable) - n(row.paid), 0),
        pill: "overdue" as const,
      };
    }),
  ]
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 8);

  const loggedBuyers = new Set(yesterdayBuyerFigures.map((row) => row.buyerId));
  const loggedPublishers = new Set(yesterdayPublisherFigures.map((row) => row.publisherId));
  const yesterdayLabel = isoDate(yesterday);
  const review: AttentionItem[] = [];
  let missingCount = 0;

  for (const row of loggerBuyers) {
    if (loggedBuyers.has(row.id) || missingCount >= 3) continue;
    missingCount += 1;
    review.push({
      id: `missing-buyer-${row.id}`,
      href: `/figures?tab=buyers&contact=${row.id}&from=${yesterdayLabel}&to=${yesterdayLabel}`,
      title: row.name,
      detail: `No buyer figures for ${yesterdayLabel}`,
      amount: null,
      pill: "missing",
    });
  }
  for (const row of loggerPublishers) {
    if (loggedPublishers.has(row.id) || missingCount >= 3) continue;
    missingCount += 1;
    review.push({
      id: `missing-publisher-${row.id}`,
      href: `/figures?tab=publishers&contact=${row.id}&from=${yesterdayLabel}&to=${yesterdayLabel}`,
      title: row.name,
      detail: `No publisher figures for ${yesterdayLabel}`,
      amount: null,
      pill: "missing",
    });
  }

  for (const row of draftBuyers) {
    review.push({
      id: row.id,
      href: `/buyers/${row.id}`,
      title: row.buyer.name,
      detail: joinDetail(row.invoiceNumber || "Draft invoice", row.vertical?.name),
      amount: n(row.receivable),
      pill: "draft",
    });
  }
  for (const row of draftPublishers) {
    review.push({
      id: row.id,
      href: `/publishers/${row.id}`,
      title: row.publisher.name,
      detail: joinDetail(row.invoiceNumber || "Draft payable", row.vertical?.name),
      amount: n(row.payable),
      pill: "draft",
    });
  }

  for (const row of pendingApprovals) {
    review.push({
      id: `approval-${row.id}`,
      href: `/publishers/${row.id}`,
      title: row.publisher.name,
      detail: row.invoiceNumber || "Publisher payment needs approval",
      amount: n(row.paid ?? row.payable),
      pill: "pending_approval",
    });
  }

  const tolerance = settings.varianceToleranceAmount;
  for (const row of recentBuyerPaid) {
    const variance = invoiceVariance(row.receivable.toString(), row.received?.toString() ?? 0, tolerance);
    if (!variance.flagged) continue;
    const less = variance.amount.lt(0);
    review.push({
      id: `var-buyer-${row.id}`,
      href: `/buyers/${row.id}`,
      title: row.buyer.name,
      detail: less
        ? `Buyer paid ${formatMoney(variance.amount.abs().toNumber())} less than invoiced`
        : `Buyer paid ${formatMoney(variance.amount.abs().toNumber())} more than invoiced`,
      amount: n(row.receivable),
      pill: "variance",
    });
  }
  for (const row of recentPublisherPaid) {
    const variance = invoiceVariance(row.payable.toString(), row.paid?.toString() ?? 0, tolerance);
    if (!variance.flagged) continue;
    const less = variance.amount.lt(0);
    review.push({
      id: `var-pub-${row.id}`,
      href: `/publishers/${row.id}`,
      title: row.publisher.name,
      detail: less
        ? `Paid ${formatMoney(variance.amount.abs().toNumber())} less than owed`
        : `Paid ${formatMoney(variance.amount.abs().toNumber())} more than owed`,
      amount: n(row.payable),
      pill: "variance",
    });
  }

  for (const row of dueSoonBuyers) {
    const days = daysUntil(row.dueDate, now);
    review.push({
      id: `soon-buyer-${row.id}`,
      href: `/buyers/${row.id}`,
      title: row.buyer.name,
      detail: joinDetail(
        row.invoiceNumber || "Invoice",
        row.vertical?.name,
        days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`,
      ),
      amount: Math.max(n(row.receivable) - n(row.received), 0),
      pill: "due_soon",
    });
  }
  for (const row of dueSoonPublishers) {
    const days = daysUntil(row.dueDate, now);
    review.push({
      id: `soon-pub-${row.id}`,
      href: `/publishers/${row.id}`,
      title: row.publisher.name,
      detail: joinDetail(
        row.invoiceNumber || "Payable",
        row.vertical?.name,
        days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`,
      ),
      amount: Math.max(n(row.payable) - n(row.paid), 0),
      pill: "due_soon",
    });
  }

  const pillRank: Record<AttentionPill, number> = {
    missing: 0,
    draft: 1,
    pending_approval: 2,
    variance: 3,
    due_soon: 4,
    overdue: 5,
    unbilled: 6,
    paid: 7,
  };

  const seen = new Set<string>();
  const reviewDeduped = review.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  return {
    overdue,
    review: reviewDeduped.sort((a, b) => pillRank[a.pill] - pillRank[b.pill]).slice(0, 8),
  };
}

export async function getDirectoryOptions(tenantId: string) {
  await ensurePpcVerticals(tenantId);
  const [buyers, publishers, verticals] = await Promise.all([
    prisma.buyer.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.publisher.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.vertical.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
  ]);
  return { buyers, publishers, verticals };
}
