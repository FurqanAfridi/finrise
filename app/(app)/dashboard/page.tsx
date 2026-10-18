import Link from "next/link";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AttentionList } from "@/components/dashboard/attention-list";
import { MonthCashCard } from "@/components/dashboard/month-cash-card";
import { MainCard } from "@/components/berry/main-card";
import { MonthPicker } from "@/components/dashboard/month-picker";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/page-header";
import { displayDate } from "@/lib/dates";
import { expectedBalance } from "@/lib/finance/monthlyOverview";
import { formatMoney, formatMoneyWhole } from "@/lib/money";
import { getDashboardAttention, getDashboardStats } from "@/lib/queries";
import { notifyMonthStart, notifyOverdueInvoices } from "@/lib/overdue-notify";
import { generateDueDraftInvoices } from "@/lib/daily-figures";
import { OPEN_BUYER_STATUSES, OPEN_PUBLISHER_STATUSES } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import {
  canWrite,
  isBuyerPortal,
  isPublisherPortal,
  requireTenant,
} from "@/lib/tenant";
import { monthName, num } from "@/lib/utils";
import { gridSpacing } from "@/theme/berry";
import type { AttentionItem } from "@/lib/queries";

/** `?period=all` → null (all months); otherwise the month in the URL, defaulting to the current month. */
function parseSelectedMonth(params: Record<string, string | undefined>) {
  if (params.period === "all") return null;
  const now = new Date();
  const year = Number(params.year);
  const month = Number(params.month);
  const validYear = Number.isInteger(year) && year >= 2000 && year <= 2100;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  return {
    year: validYear ? year : now.getUTCFullYear(),
    month: validMonth ? month : now.getUTCMonth() + 1,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireTenant();
  const writer = canWrite(ctx.tenantRole, ctx.platformRole);

  if (isBuyerPortal(ctx)) {
    return <BuyerDashboard tenantId={ctx.tenantId} buyerId={ctx.linkedBuyerId ?? "__none__"} />;
  }

  if (isPublisherPortal(ctx)) {
    return <PublisherDashboard tenantId={ctx.tenantId} publisherId={ctx.linkedPublisherId ?? "__none__"} />;
  }

  const selected = parseSelectedMonth(await searchParams);
  const [stats, attention] = await Promise.all([
    getDashboardStats(ctx.tenantId, selected),
    getDashboardAttention(ctx.tenantId),
  ]);
  void notifyOverdueInvoices(ctx.tenantId);
  void notifyMonthStart(ctx.tenantId);
  void generateDueDraftInvoices(ctx.tenantId);

  const month = stats.period;
  const monthLabel = selected ? `${monthName(selected.month)} ${selected.year}` : "All months";
  const received = month.buyerReceived.toNumber();
  const invoiced = month.buyerInvoiced.toNumber();
  const publisherPaid = month.publisherPaid.toNumber();
  const expensesPaid = month.expensesPaid.toNumber();
  const paidOut = publisherPaid + expensesPaid;
  const profit = month.profit.toNumber();
  const toCollect = stats.periodToCollect;
  const toPay = stats.periodToPay;
  const expected = expectedBalance({ profit, toCollect, toPay });

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        description={`${monthLabel} at a glance, plus what needs attention today.`}
        actionHref={writer ? "/buyers/generate" : undefined}
        actionLabel={writer ? "Create invoice" : undefined}
      >
        <MonthPicker selected={selected} />
      </PageHeader>

      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Received"
            value={formatMoneyWhole(received)}
            exactValue={formatMoney(received)}
            subtitle={`of ${formatMoneyWhole(invoiced)} invoiced`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Paid out"
            value={formatMoneyWhole(paidOut)}
            exactValue={formatMoney(paidOut)}
            subtitle={`Publishers ${formatMoneyWhole(publisherPaid)} · Expenses ${formatMoneyWhole(expensesPaid)}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label={month.profit.gte(0) ? "Profit" : "Loss"}
            value={formatMoneyWhole(profit)}
            exactValue={formatMoney(profit)}
            subtitle={
              month.marginPercent && month.revenue.gt(0) && month.profit.gte(0)
                ? `${month.marginPercent.toFixed(1)}% margin`
                : "Received minus paid out"
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Expected balance"
            value={formatMoneyWhole(expected)}
            exactValue={formatMoney(expected)}
            subtitle={`Once ${formatMoneyWhole(toCollect)} is collected and ${formatMoneyWhole(toPay)} is paid`}
          />
        </Grid>

        <Grid size={12}>
          <MainCard contentSX={{ py: 1.5 }}>
            <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 4, rowGap: 1, alignItems: "baseline" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Right now
              </Typography>
              <TodayFigure label="To collect" value={stats.ar} href="/buyers?status=UNPAID" />
              <TodayFigure label="To pay" value={stats.ap} href="/publishers?status=UNPAID" />
              <TodayFigure label="Past due" value={stats.overdueAr + stats.overdueAp} href="/buyers?status=UNPAID" />
              <Typography variant="body2" color="text.secondary">
                Waiting for approval{" "}
                <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {stats.pendingApprovals}
                </Box>
              </Typography>
            </Stack>
          </MainCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <MonthCashCard
            trend={stats.trend}
            selected={selected}
            unbilledAmount={stats.unbilledBuyerAmount + stats.unbilledPublisherAmount}
            unbilledCount={stats.unbilledBuyerCount + stats.unbilledPublisherCount}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={gridSpacing}>
            <AttentionList
              title="Past due"
              empty="Nothing past due."
              items={attention.overdue}
              viewAllHref="/buyers?status=UNPAID"
              viewAllLabel="View invoices"
            />
            <AttentionList
              title="Needs a look"
              empty="No drafts, missed days, or approvals waiting."
              items={attention.review}
              viewAllHref="/figures"
              viewAllLabel="Daily figures"
            />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

function TodayFigure({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Typography variant="body2" color="text.secondary">
      <Link href={href} style={{ color: "inherit" }}>
        {label}
      </Link>{" "}
      <Box component="span" className="fr-money" title={formatMoney(value)} sx={{ fontWeight: 700, color: "text.primary" }}>
        {formatMoneyWhole(value)}
      </Box>
    </Typography>
  );
}

async function BuyerDashboard({ tenantId, buyerId }: { tenantId: string; buyerId: string }) {
  const [openAgg, overdueAgg, paidAgg, openRows, paidRows] = await Promise.all([
    prisma.buyerInvoice.aggregate({
      where: { tenantId, buyerId, isDraft: false, paymentStatus: { in: OPEN_BUYER_STATUSES } },
      _sum: { receivable: true, received: true },
      _count: true,
    }),
    prisma.buyerInvoice.aggregate({
      where: {
        tenantId,
        buyerId,
        isDraft: false,
        paymentStatus: { in: OPEN_BUYER_STATUSES },
        dueDate: { lt: new Date() },
      },
      _sum: { receivable: true, received: true },
      _count: true,
    }),
    prisma.buyerInvoice.aggregate({
      where: { tenantId, buyerId, paymentStatus: "PAID" },
      _sum: { received: true },
      _count: true,
    }),
    prisma.buyerInvoice.findMany({
      where: { tenantId, buyerId, isDraft: false, paymentStatus: { in: OPEN_BUYER_STATUSES } },
      include: { vertical: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.buyerInvoice.findMany({
      where: { tenantId, buyerId, paymentStatus: "PAID" },
      include: { vertical: { select: { name: true } } },
      orderBy: { paidAt: "desc" },
      take: 8,
    }),
  ]);
  const due = Math.max(num(openAgg._sum.receivable) - num(openAgg._sum.received), 0);
  const overdueAmount = Math.max(num(overdueAgg._sum.receivable) - num(overdueAgg._sum.received), 0);
  const now = new Date();
  const openItems: AttentionItem[] = openRows.map((row) => {
    const pastDue = Boolean(row.dueDate && row.dueDate < now);
    return {
      id: row.id,
      href: `/buyers`,
      title: row.invoiceNumber || row.periodLabel || "Invoice",
      detail: [row.vertical?.name, row.dueDate ? `Due ${displayDate(row.dueDate)}` : null].filter(Boolean).join(" · "),
      amount: Math.max(num(row.receivable) - num(row.received), 0),
      pill: pastDue ? "overdue" : "due_soon",
    };
  });
  const paidItems: AttentionItem[] = paidRows.map((row) => ({
    id: row.id,
    href: `/buyers`,
    title: row.invoiceNumber || row.periodLabel || "Invoice",
    detail: [row.vertical?.name, row.paidAt ? `Paid ${displayDate(row.paidAt)}` : "Paid"].filter(Boolean).join(" · "),
    amount: num(row.received ?? row.receivable),
    pill: "paid",
  }));

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        description="Your invoices with this company. This view is only your account."
        actionHref="/buyers"
        actionLabel="View invoices"
      />
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard label="Amount to pay" value={formatMoney(due)} subtitle={`${openAgg._count} open invoice${openAgg._count === 1 ? "" : "s"} still unpaid`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard label="Past due" value={formatMoney(overdueAmount)} subtitle={overdueAgg._count === 0 ? "Nothing past due" : `${overdueAgg._count} invoice${overdueAgg._count === 1 ? "" : "s"} past due`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard label="Open invoices" value={String(openAgg._count)} subtitle="Waiting for payment" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard label="Paid" value={formatMoney(num(paidAgg._sum.received))} subtitle={`${paidAgg._count} settled invoice${paidAgg._count === 1 ? "" : "s"}`} />
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <AttentionList
            title="Invoices to pay"
            empty="No open invoices right now."
            items={openItems}
            viewAllHref="/buyers"
            viewAllLabel="View all"
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <AttentionList
            title="Recently paid"
            empty="No payments recorded yet."
            items={paidItems}
            viewAllHref="/buyers"
            viewAllLabel="Payment history"
          />
        </Grid>
      </Grid>
    </Box>
  );
}

async function PublisherDashboard({ tenantId, publisherId }: { tenantId: string; publisherId: string }) {
  const [openAgg, overdueAgg, paidAgg, openRows, paidRows] = await Promise.all([
    prisma.publisherInvoice.aggregate({
      where: { tenantId, publisherId, isDraft: false, paymentStatus: { in: OPEN_PUBLISHER_STATUSES } },
      _sum: { payable: true, paid: true },
      _count: true,
    }),
    prisma.publisherInvoice.aggregate({
      where: {
        tenantId,
        publisherId,
        isDraft: false,
        paymentStatus: { in: OPEN_PUBLISHER_STATUSES },
        dueDate: { lt: new Date() },
      },
      _sum: { payable: true, paid: true },
      _count: true,
    }),
    prisma.publisherInvoice.aggregate({
      where: { tenantId, publisherId, paymentStatus: "PAID" },
      _sum: { paid: true },
      _count: true,
    }),
    prisma.publisherInvoice.findMany({
      where: { tenantId, publisherId, isDraft: false, paymentStatus: { in: OPEN_PUBLISHER_STATUSES } },
      include: { vertical: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.publisherInvoice.findMany({
      where: { tenantId, publisherId, paymentStatus: "PAID" },
      include: { vertical: { select: { name: true } } },
      orderBy: { paidAt: "desc" },
      take: 8,
    }),
  ]);
  const owed = Math.max(num(openAgg._sum.payable) - num(openAgg._sum.paid), 0);
  const overdueAmount = Math.max(num(overdueAgg._sum.payable) - num(overdueAgg._sum.paid), 0);
  const now = new Date();
  const openItems: AttentionItem[] = openRows.map((row) => {
    const pastDue = Boolean(row.dueDate && row.dueDate < now);
    return {
      id: row.id,
      href: `/publishers`,
      title: row.invoiceNumber || row.periodLabel || "Payable",
      detail: [row.vertical?.name, row.dueDate ? `Due ${displayDate(row.dueDate)}` : null].filter(Boolean).join(" · "),
      amount: Math.max(num(row.payable) - num(row.paid), 0),
      pill: pastDue ? "overdue" : "due_soon",
    };
  });
  const paidItems: AttentionItem[] = paidRows.map((row) => ({
    id: row.id,
    href: `/payouts`,
    title: row.invoiceNumber || row.periodLabel || "Payable",
    detail: [row.vertical?.name, row.paidAt ? `Paid ${displayDate(row.paidAt)}` : "Paid"].filter(Boolean).join(" · "),
    amount: num(row.paid ?? row.payable),
    pill: "paid",
  }));

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        description="Your payables with this company. This view is only your account."
        actionHref="/publishers"
        actionLabel="My invoices"
      />
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard label="Money you'll receive" value={formatMoney(owed)} subtitle={`${openAgg._count} open invoice${openAgg._count === 1 ? "" : "s"} still unpaid`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard label="Past due" value={formatMoney(overdueAmount)} subtitle={overdueAgg._count === 0 ? "Nothing past due" : `${overdueAgg._count} invoice${overdueAgg._count === 1 ? "" : "s"} past due`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard label="Open invoices" value={String(openAgg._count)} subtitle="Waiting for payment" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard label="Paid" value={formatMoney(num(paidAgg._sum.paid))} subtitle={`${paidAgg._count} settled invoice${paidAgg._count === 1 ? "" : "s"}`} />
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <AttentionList
            title="Waiting for payment"
            empty="No open payables right now."
            items={openItems}
            viewAllHref="/publishers"
            viewAllLabel="View all"
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <AttentionList
            title="Recent payments"
            empty="No payments recorded yet."
            items={paidItems}
            viewAllHref="/payouts"
            viewAllLabel="Payment history"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
