import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cents, money } from "@/lib/finance/decimal";
import { computeMonthlyOverview } from "@/lib/finance/monthlyOverview";
import { monthBounds, periodFilter, yearMonthsInRange } from "@/lib/finance/period";
import { tryDistributeProfit } from "@/lib/finance/profitDistribution";
import type { FinanceSettingsInput, MonthlyOverview, PartnerInput } from "@/lib/finance/types";

function d(value: Prisma.Decimal | number | null | undefined) {
  return cents(value?.toString() ?? 0);
}

export async function getFinanceSettings(tenantId: string) {
  const row = await prisma.financeSettings.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });
  return {
    taxRatePercent: d(row.taxRatePercent),
    varianceToleranceAmount: d(row.varianceToleranceAmount),
    taxOrder: row.taxOrder as FinanceSettingsInput["taxOrder"],
    fiscalMonthStartDay: row.fiscalMonthStartDay,
  };
}

export async function getActivePartners(tenantId: string): Promise<PartnerInput[]> {
  const rows = await prisma.partner.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    sharePercent: money(row.sharePercent.toString()),
  }));
}

export async function loadMonthlyTotals(tenantId: string, year: number, month: number, fiscalMonthStartDay = 1) {
  const { start, end } = monthBounds(year, month, fiscalMonthStartDay);
  const dateFilter = periodFilter(start, end);

  const [buyers, publishers, expenses] = await Promise.all([
    prisma.buyerInvoice.aggregate({
      where: { tenantId, ...dateFilter },
      _sum: { receivable: true, received: true, revenue: true },
    }),
    prisma.publisherInvoice.aggregate({
      where: { tenantId, ...dateFilter },
      _sum: { payable: true, amount: true, paid: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, year, month },
      _sum: { actual: true, paid: true },
    }),
  ]);

  return {
    buyerInvoiced: d(buyers._sum.receivable ?? buyers._sum.revenue),
    buyerReceived: d(buyers._sum.received),
    publisherOwed: d(publishers._sum.payable ?? publishers._sum.amount),
    publisherPaid: d(publishers._sum.paid),
    expensesActual: d(expenses._sum.actual),
    expensesPaid: d(expenses._sum.paid),
  };
}

export async function loadMonthlyLines(tenantId: string, year: number, month: number, fiscalMonthStartDay = 1) {
  const { start, end } = monthBounds(year, month, fiscalMonthStartDay);
  const dateFilter = periodFilter(start, end);

  const [buyerGroups, publisherGroups, expenses] = await Promise.all([
    prisma.buyerInvoice.groupBy({
      by: ["buyerId"],
      where: { tenantId, ...dateFilter },
      _sum: { receivable: true, received: true, revenue: true },
    }),
    prisma.publisherInvoice.groupBy({
      by: ["publisherId"],
      where: { tenantId, ...dateFilter },
      _sum: { payable: true, amount: true, paid: true },
    }),
    prisma.expense.findMany({
      where: { tenantId, year, month },
      include: { categoryRel: true },
      orderBy: { category: "asc" },
    }),
  ]);

  const [buyers, publishers] = await Promise.all([
    prisma.buyer.findMany({
      where: { id: { in: buyerGroups.map((row) => row.buyerId) } },
      select: { id: true, name: true },
    }),
    prisma.publisher.findMany({
      where: { id: { in: publisherGroups.map((row) => row.publisherId) } },
      select: { id: true, name: true },
    }),
  ]);
  const buyerNames = Object.fromEntries(buyers.map((row) => [row.id, row.name]));
  const publisherNames = Object.fromEntries(publishers.map((row) => [row.id, row.name]));

  return {
    buyers: buyerGroups
      .map((row) => ({
        id: row.buyerId,
        name: buyerNames[row.buyerId] ?? row.buyerId,
        actual: d(row._sum.receivable ?? row._sum.revenue),
        received: d(row._sum.received),
      }))
      .sort((a, b) => b.actual.cmp(a.actual)),
    publishers: publisherGroups
      .map((row) => ({
        id: row.publisherId,
        name: publisherNames[row.publisherId] ?? row.publisherId,
        actual: d(row._sum.payable ?? row._sum.amount),
        paid: d(row._sum.paid),
      }))
      .sort((a, b) => b.actual.cmp(a.actual)),
    expenses: expenses.map((row) => ({
      id: row.id,
      label: row.label ?? row.categoryRel?.name ?? row.category,
      actual: d(row.actual),
      paid: d(row.paid),
    })),
  };
}

export async function computeTenantMonth(tenantId: string, year: number, month: number) {
  const settings = await getFinanceSettings(tenantId);
  const totals = await loadMonthlyTotals(tenantId, year, month, settings.fiscalMonthStartDay);
  const overview = computeMonthlyOverview(totals);
  const partners = await getActivePartners(tenantId);
  const distribution =
    partners.filter((row) => row.tier === "EQUITY").length > 0
      ? tryDistributeProfit(overview.profit, partners, settings)
      : null;
  return { settings, totals, overview, partners, distribution };
}

export async function loadPeriodTotals(tenantId: string, start: Date, end: Date) {
  const dateFilter = periodFilter(start, end);
  const months = yearMonthsInRange(start, end);

  const [buyers, publishers, expenses] = await Promise.all([
    prisma.buyerInvoice.aggregate({
      where: { tenantId, ...dateFilter },
      _sum: { receivable: true, received: true, revenue: true },
    }),
    prisma.publisherInvoice.aggregate({
      where: { tenantId, ...dateFilter },
      _sum: { payable: true, amount: true, paid: true },
    }),
    months.length
      ? prisma.expense.aggregate({
          where: {
            tenantId,
            OR: months.map((row) => ({ year: row.year, month: row.month })),
          },
          _sum: { actual: true, paid: true },
        })
      : Promise.resolve({ _sum: { actual: null, paid: null } }),
  ]);

  return {
    buyerInvoiced: d(buyers._sum.receivable ?? buyers._sum.revenue),
    buyerReceived: d(buyers._sum.received),
    publisherOwed: d(publishers._sum.payable ?? publishers._sum.amount),
    publisherPaid: d(publishers._sum.paid),
    expensesActual: d(expenses._sum.actual),
    expensesPaid: d(expenses._sum.paid),
  };
}

export async function loadPeriodLines(tenantId: string, start: Date, end: Date) {
  const dateFilter = periodFilter(start, end);
  const months = yearMonthsInRange(start, end);

  const [buyerGroups, publisherGroups, expenses] = await Promise.all([
    prisma.buyerInvoice.groupBy({
      by: ["buyerId"],
      where: { tenantId, ...dateFilter },
      _sum: { receivable: true, received: true, revenue: true },
    }),
    prisma.publisherInvoice.groupBy({
      by: ["publisherId"],
      where: { tenantId, ...dateFilter },
      _sum: { payable: true, amount: true, paid: true },
    }),
    months.length
      ? prisma.expense.findMany({
          where: {
            tenantId,
            OR: months.map((row) => ({ year: row.year, month: row.month })),
          },
          include: { categoryRel: true },
          orderBy: [{ year: "desc" }, { month: "desc" }, { category: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const [buyers, publishers] = await Promise.all([
    prisma.buyer.findMany({
      where: { id: { in: buyerGroups.map((row) => row.buyerId) } },
      select: { id: true, name: true },
    }),
    prisma.publisher.findMany({
      where: { id: { in: publisherGroups.map((row) => row.publisherId) } },
      select: { id: true, name: true },
    }),
  ]);
  const buyerNames = Object.fromEntries(buyers.map((row) => [row.id, row.name]));
  const publisherNames = Object.fromEntries(publishers.map((row) => [row.id, row.name]));

  return {
    buyers: buyerGroups
      .map((row) => ({
        id: row.buyerId,
        name: buyerNames[row.buyerId] ?? row.buyerId,
        actual: d(row._sum.receivable ?? row._sum.revenue),
        received: d(row._sum.received),
      }))
      .sort((a, b) => b.actual.cmp(a.actual)),
    publishers: publisherGroups
      .map((row) => ({
        id: row.publisherId,
        name: publisherNames[row.publisherId] ?? row.publisherId,
        actual: d(row._sum.payable ?? row._sum.amount),
        paid: d(row._sum.paid),
      }))
      .sort((a, b) => b.actual.cmp(a.actual)),
    expenses: expenses.map((row) => ({
      id: row.id,
      label: `${row.label ?? row.categoryRel?.name ?? row.category} (${row.year}-${String(row.month).padStart(2, "0")})`,
      actual: d(row.actual),
      paid: d(row.paid),
    })),
  };
}

export async function computeTenantPeriod(tenantId: string, start: Date, end: Date) {
  const settings = await getFinanceSettings(tenantId);
  const totals = await loadPeriodTotals(tenantId, start, end);
  const overview = computeMonthlyOverview(totals);
  const partners = await getActivePartners(tenantId);
  const distribution =
    partners.filter((row) => row.tier === "EQUITY").length > 0
      ? tryDistributeProfit(overview.profit, partners, settings)
      : null;
  return { settings, totals, overview, partners, distribution };
}

export async function listMonthKeys(tenantId: string) {
  const [buyerMonths, publisherMonths, expenseMonths] = await Promise.all([
    prisma.$queryRaw<{ year: number; month: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM COALESCE("periodStart", "dueDate"))::int AS year,
                      EXTRACT(MONTH FROM COALESCE("periodStart", "dueDate"))::int AS month
      FROM "BuyerInvoice"
      WHERE "tenantId" = ${tenantId}
        AND COALESCE("periodStart", "dueDate") IS NOT NULL
    `,
    prisma.$queryRaw<{ year: number; month: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM COALESCE("periodStart", "dueDate"))::int AS year,
                      EXTRACT(MONTH FROM COALESCE("periodStart", "dueDate"))::int AS month
      FROM "PublisherInvoice"
      WHERE "tenantId" = ${tenantId}
        AND COALESCE("periodStart", "dueDate") IS NOT NULL
    `,
    prisma.expense.findMany({
      where: { tenantId },
      distinct: ["year", "month"],
      select: { year: true, month: true },
    }),
  ]);

  const keys = new Map<string, { year: number; month: number }>();
  for (const row of [...buyerMonths, ...publisherMonths, ...expenseMonths]) {
    if (!row.year || !row.month) continue;
    keys.set(`${row.year}-${row.month}`, { year: Number(row.year), month: Number(row.month) });
  }
  return [...keys.values()].sort((a, b) => b.year - a.year || b.month - a.month);
}

export async function monthlyProfitSeries(tenantId: string) {
  const keys = await listMonthKeys(tenantId);
  const settings = await getFinanceSettings(tenantId);
  const series: { year: number; month: number; overview: MonthlyOverview }[] = [];
  for (const key of keys) {
    const totals = await loadMonthlyTotals(tenantId, key.year, key.month, settings.fiscalMonthStartDay);
    series.push({ ...key, overview: computeMonthlyOverview(totals) });
  }
  return { settings, series };
}

export async function overallProfit(tenantId: string) {
  const [{ settings, series }, withdrawals] = await Promise.all([
    monthlyProfitSeries(tenantId),
    prisma.partnerWithdrawal.aggregate({
      where: { tenantId },
      _sum: { amountBase: true },
    }),
  ]);
  const totalSavings = series.reduce((sum, row) => sum.add(row.overview.profit), money(0));
  const totalWithdrawn = d(withdrawals._sum.amountBase);
  return {
    settings,
    series,
    totalSavings: cents(totalSavings),
    totalWithdrawn,
    totalRemaining: cents(totalSavings.sub(totalWithdrawn)),
  };
}
