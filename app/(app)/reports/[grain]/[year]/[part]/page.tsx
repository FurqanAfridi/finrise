import Link from "next/link";
import { notFound } from "next/navigation";
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
import { NativeSelect } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { boundsForGrain, type ReportGrain } from "@/lib/finance/period";
import { computeTenantPeriod, getFinanceSettings, loadPeriodLines } from "@/lib/finance/queries";
import { formatMoney } from "@/lib/money";
import { requireBrokerOps } from "@/lib/tenant";
import { monthName } from "@/lib/utils";
import { gridSpacing } from "@/theme/berry";

const GRAINS: ReportGrain[] = ["week", "month", "quarter", "year"];

export default async function PeriodReportPage({
  params,
}: {
  params: Promise<{ grain: string; year: string; part: string }>;
}) {
  const ctx = await requireBrokerOps();
  const { grain: grainRaw, year: yearRaw, part: partRaw } = await params;
  const grain = grainRaw as ReportGrain;
  if (!GRAINS.includes(grain)) notFound();

  const year = Number(yearRaw);
  const part = Number(partRaw);
  if (!Number.isFinite(year) || !Number.isFinite(part) || part < 1) notFound();

  const settings = await getFinanceSettings(ctx.tenantId);
  const bounds = boundsForGrain(grain, year, part, settings.fiscalMonthStartDay);
  const [current, lines] = await Promise.all([
    computeTenantPeriod(ctx.tenantId, bounds.start, bounds.end),
    loadPeriodLines(ctx.tenantId, bounds.start, bounds.end),
  ]);

  const { overview, distribution } = current;
  const hasLines = lines.buyers.length + lines.publishers.length + lines.expenses.length > 0;
  const years = Array.from({ length: 6 }, (_, i) => new Date().getUTCFullYear() - i);
  const partMax = grain === "week" ? 53 : grain === "month" ? 12 : grain === "quarter" ? 4 : 1;

  return (
    <Box>
      <PageHeader
        title={bounds.label}
        description={`${grainLabel(grain)} report — cash in, cash out, and what’s left.`}
      >
        <Link href="/reports">
          <Button variant="outlined" color="primary">
            All reports
          </Button>
        </Link>
        {grain === "month" ? (
          <Link href={`/reports/monthly/${year}/${part}`}>
            <Button variant="outlined" color="primary">
              Classic monthly view
            </Button>
          </Link>
        ) : null}
      </PageHeader>

      <MainCard sx={{ mb: 3 }} contentSX={{ py: 2 }}>
        <Box
          component="form"
          action="/reports/go"
          sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <Box sx={{ minWidth: 140, flex: "1 1 140px" }}>
            <NativeSelect label="Report type" name="grain" defaultValue={grain}>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </NativeSelect>
          </Box>
          <Box sx={{ minWidth: 120, flex: "1 1 120px" }}>
            <NativeSelect label="Year" name="year" defaultValue={String(year)}>
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </NativeSelect>
          </Box>
          {grain !== "year" ? (
            <Box sx={{ minWidth: 160, flex: "1 1 160px" }}>
              <NativeSelect label={partFieldLabel(grain)} name="part" defaultValue={String(part)}>
                {Array.from({ length: partMax }, (_, i) => i + 1).map((value) => (
                  <option key={value} value={value}>
                    {partOptionLabel(grain, value)}
                  </option>
                ))}
              </NativeSelect>
            </Box>
          ) : (
            <input type="hidden" name="part" value="1" />
          )}
          <Button type="submit" variant="contained" color="primary">
            Show report
          </Button>
        </Box>
      </MainCard>

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Money received"
            value={formatMoney(overview.buyerReceived.toNumber())}
            subtitle="Cash in from buyers in this period"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Paid to publishers"
            value={formatMoney(overview.publisherPaid.toNumber())}
            subtitle="Cash out for traffic in this period"
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
            subtitle="After publisher payouts and expenses"
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
          title="No activity in this period"
          description="Try another range, or upload historical invoices and expenses from Settings → Import."
          actionHref="/settings?tab=import"
          actionLabel="Upload history"
        />
      ) : (
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <MainCard content={false} title="Buyers">
              <SummaryTable
                empty="No buyer remittances in this period."
                rows={lines.buyers.map((row) => [row.name, row.actual.toNumber(), row.received.toNumber()])}
                actualLabel="Invoiced"
                paidLabel="Received"
              />
            </MainCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <MainCard content={false} title="Publishers">
              <SummaryTable
                empty="No publisher payments in this period."
                rows={lines.publishers.map((row) => [row.name, row.actual.toNumber(), row.paid.toNumber()])}
                actualLabel="Owed"
                paidLabel="Paid"
              />
            </MainCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <MainCard content={false} title="Expenses">
              <SummaryTable
                empty="No expenses overlapping this period."
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

function grainLabel(grain: ReportGrain) {
  if (grain === "week") return "Weekly";
  if (grain === "quarter") return "Quarterly";
  if (grain === "year") return "Yearly";
  return "Monthly";
}

function partFieldLabel(grain: ReportGrain) {
  if (grain === "week") return "Week";
  if (grain === "quarter") return "Quarter";
  return "Month";
}

function partOptionLabel(grain: ReportGrain, value: number) {
  if (grain === "week") return `Week ${value}`;
  if (grain === "quarter") return `Q${value}`;
  return monthName(value);
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
