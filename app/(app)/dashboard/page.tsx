import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MainCard } from "@/components/berry/main-card";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusPill } from "@/components/shared/status-pill";
import { PageHeader } from "@/components/page-header";
import { displayDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getDashboardAttention, getDashboardStats, getMonthlyTrend } from "@/lib/queries";
import { notifyMonthStart, notifyOverdueInvoices } from "@/lib/overdue-notify";
import { OPEN_BUYER_STATUSES, OPEN_PUBLISHER_STATUSES } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import {
  canWrite,
  isBuyerPortal,
  isPublisherPortal,
  requireTenant,
} from "@/lib/tenant";
import { num } from "@/lib/utils";
import { gridSpacing } from "@/theme/berry";

export default async function DashboardPage() {
  const ctx = await requireTenant();
  const writer = canWrite(ctx.tenantRole, ctx.platformRole);

  if (isBuyerPortal(ctx)) {
    const buyerId = ctx.linkedBuyerId ?? "__none__";
    const [open, overdue, paid] = await Promise.all([
      prisma.buyerInvoice.aggregate({
        where: { tenantId: ctx.tenantId, buyerId, paymentStatus: { in: OPEN_BUYER_STATUSES } },
        _sum: { receivable: true, received: true },
        _count: true,
      }),
      prisma.buyerInvoice.findMany({
        where: {
          tenantId: ctx.tenantId,
          buyerId,
          paymentStatus: { in: OPEN_BUYER_STATUSES },
          dueDate: { lt: new Date() },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.buyerInvoice.aggregate({
        where: { tenantId: ctx.tenantId, buyerId, paymentStatus: "PAID" },
        _sum: { received: true },
        _count: true,
      }),
    ]);
    const due = Math.max(num(open._sum.receivable) - num(open._sum.received), 0);

    return (
      <Box>
        <PageHeader
          title="Dashboard"
          description="Your invoices with this company — only your account."
          actionHref="/buyers"
          actionLabel="View invoices"
        />
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <KpiCard label="Amount to pay" value={formatMoney(due)} subtitle="Open invoices still unpaid" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <KpiCard
              label="Open invoices"
              value={String(open._count)}
              subtitle="Waiting for payment"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <KpiCard
              label="Paid"
              value={formatMoney(num(paid._sum.received))}
              subtitle={`${paid._count} settled invoice${paid._count === 1 ? "" : "s"}`}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <MainCard title="Overdue">
              {overdue.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nothing overdue.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {overdue.map((row) => (
                    <Stack key={row.id} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          <Link href={`/buyers`} style={{ color: "inherit", textDecoration: "none" }}>
                            {row.invoiceNumber || row.periodLabel || "Invoice"}
                          </Link>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Due {displayDate(row.dueDate)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography className="fr-money" variant="body2" sx={{ fontWeight: 600 }}>
                          {formatMoney(Math.max(num(row.receivable) - num(row.received), 0))}
                        </Typography>
                        <StatusPill kind="overdue" />
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </MainCard>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (isPublisherPortal(ctx)) {
    const publisherId = ctx.linkedPublisherId ?? "__none__";
    const [open, paidRows] = await Promise.all([
      prisma.publisherInvoice.aggregate({
        where: { tenantId: ctx.tenantId, publisherId, paymentStatus: { in: OPEN_PUBLISHER_STATUSES } },
        _sum: { payable: true, paid: true },
        _count: true,
      }),
      prisma.publisherInvoice.findMany({
        where: { tenantId: ctx.tenantId, publisherId, paymentStatus: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 5,
      }),
    ]);
    const owed = Math.max(num(open._sum.payable) - num(open._sum.paid), 0);

    return (
      <Box>
        <PageHeader
          title="Dashboard"
          description="Your payables with this company — only your account."
          actionHref="/publishers"
          actionLabel="My invoices"
        />
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <KpiCard label="Money you'll receive" value={formatMoney(owed)} subtitle="Open payables still unpaid" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <KpiCard label="Open invoices" value={String(open._count)} subtitle="Waiting for payment" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <KpiCard
              label="Recent payments"
              value={String(paidRows.length)}
              subtitle="Latest settled payables"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <MainCard
              title="Recent payments"
              secondary={
                <Link href="/payouts" style={{ textDecoration: "none" }}>
                  <Button size="small" color="primary">
                    Payment history
                  </Button>
                </Link>
              }
            >
              {paidRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No payments recorded yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {paidRows.map((row) => (
                    <Stack key={row.id} direction="row" sx={{ justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.invoiceNumber || row.periodLabel || "Payable"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Paid {displayDate(row.paidAt)}
                        </Typography>
                      </Box>
                      <Typography className="fr-money" variant="body2" sx={{ fontWeight: 600 }}>
                        {formatMoney(num(row.paid ?? row.payable))}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </MainCard>
          </Grid>
        </Grid>
      </Box>
    );
  }

  const [stats, trend, attention] = await Promise.all([
    getDashboardStats(ctx.tenantId),
    getMonthlyTrend(ctx.tenantId),
    getDashboardAttention(ctx.tenantId),
  ]);
  void notifyOverdueInvoices(ctx.tenantId);
  void notifyMonthStart(ctx.tenantId);
  const max = Math.max(...trend.map((row) => Math.abs(row.savings)), 1);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        description="A quick look at cash and what needs your attention."
        actionHref={writer ? "/buyers/generate" : undefined}
        actionLabel={writer ? "Create invoice" : undefined}
      />

      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Money you'll receive"
            value={formatMoney(stats.ar)}
            subtitle="Open buyer invoices still unpaid"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Cash received"
            value={formatMoney(stats.received)}
            subtitle="Total paid in by buyers"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Profit this month"
            value={formatMoney(stats.latest?.overview.profit.toNumber() ?? stats.profit)}
            subtitle="After publisher payouts and expenses"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Overdue"
            value={formatMoney(stats.overdueAr)}
            subtitle={
              stats.overdueCount === 0
                ? "Nothing past due"
                : `${stats.overdueCount} invoice${stats.overdueCount === 1 ? "" : "s"} past due`
            }
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <MainCard title="Monthly profit">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Cash profit by month for {ctx.tenantName}
            </Typography>
            {trend.length === 0 ? (
              <EmptyState
                title="No months yet"
                description="Create invoices and record payments to see profit here."
                actionHref="/buyers/generate"
                actionLabel="Create invoice"
              />
            ) : (
              <Box sx={{ display: "flex", height: 220, alignItems: "flex-end", gap: 1 }}>
                {trend.map((row) => (
                  <Box
                    key={row.label}
                    sx={{ flex: 1, height: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
                  >
                    <Box
                      title={`${row.label}: ${formatMoney(row.savings)}`}
                      sx={{
                        width: 1,
                        borderRadius: "6px 6px 0 0",
                        bgcolor: row.savings >= 0 ? "primary.main" : "error.main",
                        height: `${Math.max((Math.abs(row.savings) / max) * 100, 4)}%`,
                        transition: "height 200ms ease",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
                      {row.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </MainCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={gridSpacing}>
            <MainCard
              title="Overdue invoices"
              secondary={
                <Link href="/buyers" style={{ textDecoration: "none" }}>
                  <Button size="small" color="primary">
                    View all
                  </Button>
                </Link>
              }
            >
              {attention.overdueInvoices.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nothing overdue. Nice work.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {attention.overdueInvoices.map((row) => (
                    <Stack
                      key={row.id}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          <Link href={`/buyers/${row.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                            {row.buyerName}
                          </Link>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.invoiceNumber || "Draft"} · due {displayDate(row.dueDate)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
                        <Typography className="fr-money" variant="body2" sx={{ fontWeight: 600 }}>
                          {formatMoney(row.outstanding)}
                        </Typography>
                        <StatusPill kind="overdue" />
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </MainCard>

            <MainCard
              title="Needs approval"
              secondary={
                <Link href="/publishers" style={{ textDecoration: "none" }}>
                  <Button size="small" color="primary">
                    View all
                  </Button>
                </Link>
              }
            >
              {attention.pendingApprovals.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No publisher payments waiting for approval.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {attention.pendingApprovals.map((row) => (
                    <Stack
                      key={row.id}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          <Link href={`/publishers/${row.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                            {row.publisherName}
                          </Link>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.invoiceNumber || "Payable"}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
                        <Typography className="fr-money" variant="body2" sx={{ fontWeight: 600 }}>
                          {formatMoney(row.amount)}
                        </Typography>
                        <StatusPill kind="pending_approval" />
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </MainCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
