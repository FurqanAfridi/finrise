import { Prisma } from "@prisma/client";
import { OPEN_BUYER_STATUSES, OPEN_PUBLISHER_STATUSES } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { cents } from "@/lib/finance/decimal";
import { overallProfit } from "@/lib/finance/queries";
import { monthName } from "@/lib/utils";

function n(value: Prisma.Decimal | number | null | undefined) {
  return cents(value?.toString() ?? 0).toNumber();
}

export async function getSetting(tenantId: string, key: string, fallback = "") {
  const row = await prisma.setting.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });
  return row?.value ?? fallback;
}

export async function getDashboardStats(tenantId: string) {
  const [
    profit,
    buyerAgg,
    publisherAgg,
    unpaidBuyers,
    unpaidPublishers,
    overdueBuyers,
    pendingApprovals,
    bankAccounts,
  ] = await Promise.all([
    overallProfit(tenantId),
    prisma.buyerInvoice.aggregate({
      where: { tenantId },
      _sum: { revenue: true, receivable: true, received: true },
      _count: true,
    }),
    prisma.publisherInvoice.aggregate({
      where: { tenantId },
      _sum: { amount: true, payable: true, paid: true },
      _count: true,
    }),
    prisma.buyerInvoice.aggregate({
      where: { tenantId, paymentStatus: { in: OPEN_BUYER_STATUSES } },
      _sum: { receivable: true, received: true },
    }),
    prisma.publisherInvoice.aggregate({
      where: { tenantId, paymentStatus: { in: OPEN_PUBLISHER_STATUSES } },
      _sum: { payable: true, paid: true },
    }),
    prisma.buyerInvoice.aggregate({
      where: {
        tenantId,
        paymentStatus: { in: OPEN_BUYER_STATUSES },
        dueDate: { lt: new Date() },
      },
      _sum: { receivable: true, received: true },
      _count: true,
    }),
    prisma.publisherInvoice.count({
      where: { tenantId, paidApprovalStatus: "PENDING" },
    }),
    prisma.bankAccount.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
  ]);

  const latest = profit.series[0];
  const ar = n(unpaidBuyers._sum.receivable) - n(unpaidBuyers._sum.received);

  return {
    revenue: n(buyerAgg._sum.revenue),
    received: n(buyerAgg._sum.received),
    publisherCost: n(publisherAgg._sum.amount),
    publisherPaid: n(publisherAgg._sum.paid),
    opex: profit.series.reduce((sum, row) => sum + row.overview.expenses.toNumber(), 0),
    netFromCash: profit.series.reduce((sum, row) => sum + row.overview.revenue.toNumber(), 0),
    profit: profit.totalSavings.toNumber(),
    totalSavings: profit.totalSavings.toNumber(),
    totalWithdrawn: profit.totalWithdrawn.toNumber(),
    remaining: profit.totalRemaining.toNumber(),
    taxRate: profit.settings.taxRatePercent.toNumber(),
    ar: Math.max(ar, 0),
    ap: n(unpaidPublishers._sum.payable) - n(unpaidPublishers._sum.paid),
    overdueAr: Math.max(n(overdueBuyers._sum.receivable) - n(overdueBuyers._sum.received), 0),
    overdueCount: overdueBuyers._count,
    buyerInvoiceCount: buyerAgg._count,
    publisherInvoiceCount: publisherAgg._count,
    pendingApprovals,
    bankAccounts,
    latest,
    series: profit.series,
  };
}

export async function getMonthlyTrend(tenantId: string) {
  const { series } = await overallProfit(tenantId);
  return series.slice(0, 12).reverse().map((row) => ({
    label: `${monthName(row.month).slice(0, 3)} ${String(row.year).slice(2)}`,
    year: row.year,
    month: row.month,
    savings: row.overview.profit.toNumber(),
  }));
}

/** Short “needs attention” lists for the dashboard (progressive disclosure). */
export async function getDashboardAttention(tenantId: string) {
  const [overdueInvoices, pendingApprovals] = await Promise.all([
    prisma.buyerInvoice.findMany({
      where: {
        tenantId,
        paymentStatus: { in: OPEN_BUYER_STATUSES },
        dueDate: { lt: new Date() },
      },
      include: { buyer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.publisherInvoice.findMany({
      where: { tenantId, paidApprovalStatus: "PENDING" },
      include: { publisher: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    overdueInvoices: overdueInvoices.map((row) => ({
      id: row.id,
      buyerName: row.buyer.name,
      invoiceNumber: row.invoiceNumber,
      dueDate: row.dueDate,
      outstanding: Math.max(n(row.receivable) - n(row.received), 0),
    })),
    pendingApprovals: pendingApprovals.map((row) => ({
      id: row.id,
      publisherName: row.publisher.name,
      invoiceNumber: row.invoiceNumber,
      amount: n(row.paid ?? row.payable),
    })),
  };
}

export async function getDirectoryOptions(tenantId: string) {
  const [buyers, publishers, verticals] = await Promise.all([
    prisma.buyer.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.publisher.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.vertical.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
  ]);
  return { buyers, publishers, verticals };
}
