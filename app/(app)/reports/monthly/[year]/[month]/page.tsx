import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { MainCard } from "@/components/berry/main-card";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { NativeSelect } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { computeTenantMonth, listMonthKeys, loadMonthlyLines } from "@/lib/finance/queries";
import { previousMonth } from "@/lib/finance/period";
import { formatMoney } from "@/lib/money";
import { requireBrokerOps } from "@/lib/tenant";
import { monthName } from "@/lib/utils";
import { gridSpacing } from "@/theme/berry";

export default async function MonthlyOverviewPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const ctx = await requireBrokerOps();
  const { year: yearRaw, month: monthRaw } = await params;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const prev = previousMonth(year, month);

  const [current, previous, lines, keys] = await Promise.all([
    computeTenantMonth(ctx.tenantId, year, month),
    computeTenantMonth(ctx.tenantId, prev.year, prev.month),
    loadMonthlyLines(ctx.tenantId, year, month),
    listMonthKeys(ctx.tenantId),
  ]);

  const { overview, distribution } = current;
  const years = [...new Set(keys.map((row) => row.year))];
  if (!years.includes(year)) years.push(year);
  const mom = overview.profit.sub(previous.overview.profit).toNumber();
  const hasLines = lines.buyers.length + lines.publishers.length + lines.expenses.length > 0;

  return (
    <Box>
      <PageHeader
        title={`${monthName(month)} ${year}`}
        description="How this month looks so far — cash in, cash out, and what’s left."
      >
        <Link href={`/reports/monthly/${year}/${month}/csv`}>
          <Button variant="outlined" color="primary">
            Download CSV
          </Button>
        </Link>
        <Link href={`/reports/monthly/${year}/${month}/print`}>
          <Button variant="outlined" color="primary">
            Print
          </Button>
        </Link>
      </PageHeader>

      <MainCard sx={{ mb: 3 }} contentSX={{ py: 2 }}>
        <Box
          component="form"
          action="/reports/monthly/go"
          sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <Box sx={{ minWidth: 140, flex: "1 1 140px" }}>
            <NativeSelect label="Year" name="year" defaultValue={String(year)}>
              {(years.length ? years.sort((a, b) => a - b) : [year]).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </NativeSelect>
          </Box>
          <Box sx={{ minWidth: 180, flex: "1 1 180px" }}>
            <NativeSelect label="Month" name="month" defaultValue={String(month)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => (
                <option key={value} value={value}>
                  {monthName(value)}
                </option>
              ))}
            </NativeSelect>
          </Box>
          <Button type="submit" variant="contained" color="primary">
            Show month
          </Button>
        </Box>
      </MainCard>

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Money received"
            value={formatMoney(overview.buyerReceived.toNumber())}
            subtitle="Cash in from buyers this month"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Paid to publishers"
            value={formatMoney(overview.publisherPaid.toNumber())}
            subtitle="Cash out for traffic this month"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Expenses paid"
            value={formatMoney(overview.expenses.toNumber())}
            subtitle={`Booked expenses ${formatMoney(overview.expensesActual.toNumber())}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label={overview.profitLabel || "Profit"}
            value={formatMoney(overview.profit.toNumber())}
            subtitle={
              mom === 0
                ? `Same as ${monthName(prev.month)}`
                : `${mom > 0 ? "Up" : "Down"} ${formatMoney(Math.abs(mom))} vs ${monthName(prev.month)}`
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <MainCard title="Tax and partner share">
            {distribution ? (
              <Stack spacing={1.25}>
                <MoneyRow label="Profit before tax" value={overview.profit.toNumber()} />
                <MoneyRow
                  label={`Tax set aside (${current.settings.taxRatePercent.toNumber()}%)`}
                  value={distribution.taxReserve.toNumber()}
                />
                <MoneyRow label="Left to split with partners" value={distribution.afterTax.toNumber()} strong />
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Add equity partners in Partners to see tax and how profit is split.
              </Typography>
            )}
          </MainCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MainCard title="Expected vs cash">
            <Stack spacing={1.25}>
              <MoneyRow label="Expected profit (invoiced)" value={overview.expectedProfit.toNumber()} />
              <MoneyRow label="Cash profit (settled)" value={overview.profit.toNumber()} />
              <MoneyRow label="Cash gap" value={overview.cashGap.toNumber()} />
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                Cash gap is the difference between what invoices say and what has actually been paid.
              </Typography>
            </Stack>
          </MainCard>
        </Grid>
      </Grid>

      {!hasLines ? (
        <EmptyState
          title="No activity this month yet"
          description="When you create invoices or record expenses for this month, the breakdowns appear here."
          actionHref="/buyers/generate"
          actionLabel="Create invoice"
        />
      ) : (
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <MainCard content={false} title="Buyers">
              <SummaryTable
                empty="No buyer remittances this month."
                rows={lines.buyers.map((row) => [row.name, row.actual.toNumber(), row.received.toNumber()])}
                actualLabel="Invoiced"
                paidLabel="Received"
              />
            </MainCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <MainCard content={false} title="Publishers">
              <SummaryTable
                empty="No publisher payments this month."
                rows={lines.publishers.map((row) => [row.name, row.actual.toNumber(), row.paid.toNumber()])}
                actualLabel="Owed"
                paidLabel="Paid"
              />
            </MainCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <MainCard content={false} title="Expenses">
              <SummaryTable
                empty="No expenses this month."
                rows={lines.expenses.map((row) => [row.label, row.actual.toNumber(), row.paid.toNumber()])}
                actualLabel="Booked"
                paidLabel="Paid"
              />
            </MainCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

function MoneyRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        className="fr-money"
        variant={strong ? "subtitle1" : "body2"}
        sx={{ fontWeight: strong ? 700 : 600, color: strong ? "primary.main" : "inherit" }}
      >
        {formatMoney(value)}
      </Typography>
    </Stack>
  );
}

function SummaryTable({
  rows,
  actualLabel,
  paidLabel,
  empty,
}: {
  rows: [string, number, number][];
  actualLabel: string;
  paidLabel: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <Box sx={{ px: 2.5, py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {empty}
        </Typography>
      </Box>
    );
  }

  const actual = rows.reduce((sum, row) => sum + row[1], 0);
  const paid = rows.reduce((sum, row) => sum + row[2], 0);

  return (
    <TableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">{actualLabel}</TableCell>
            <TableCell align="right">{paidLabel}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([name, a, p]) => (
            <TableRow key={name} hover>
              <TableCell>{name}</TableCell>
              <TableCell align="right" className="fr-money">
                {formatMoney(a)}
              </TableCell>
              <TableCell align="right" className="fr-money">
                {formatMoney(p)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: "var(--fr-surface-muted)" }}>
            <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
            <TableCell align="right" className="fr-money" sx={{ fontWeight: 700 }}>
              {formatMoney(actual)}
            </TableCell>
            <TableCell align="right" className="fr-money" sx={{ fontWeight: 700 }}>
              {formatMoney(paid)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
