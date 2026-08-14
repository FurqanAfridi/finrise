import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MainCard } from "@/components/berry/main-card";
import { NativeSelect } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { currentIsoWeek } from "@/lib/finance/period";
import { listMonthKeys, overallProfit } from "@/lib/finance/queries";
import { formatMoney } from "@/lib/money";
import { requireBrokerOps } from "@/lib/tenant";
import { monthName } from "@/lib/utils";
import { gridSpacing } from "@/theme/berry";

export default async function ReportsIndexPage() {
  const ctx = await requireBrokerOps();
  const now = new Date();
  const week = currentIsoWeek(now);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const quarter = Math.floor((month - 1) / 3) + 1;

  const [keys, overall] = await Promise.all([
    listMonthKeys(ctx.tenantId),
    overallProfit(ctx.tenantId),
  ]);

  const years = [...new Set([year, ...keys.map((row) => row.year)])].sort((a, b) => b - a);
  const latest = keys[0] ?? { year, month };

  return (
    <Box>
      <PageHeader
        title="Reports"
        description="See profit by week, month, quarter, or year, then drill into the breakdown."
      />

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="All-time savings"
            value={formatMoney(overall.totalSavings.toNumber())}
            subtitle="Profit across every month on record"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Withdrawn"
            value={formatMoney(overall.totalWithdrawn.toNumber())}
            subtitle="Partner withdrawals so far"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Still available"
            value={formatMoney(overall.totalRemaining.toNumber())}
            subtitle="Savings minus withdrawals"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Months tracked"
            value={String(overall.series.length)}
            subtitle={
              latest
                ? `Latest activity ${monthName(latest.month)} ${latest.year}`
                : "No ledger activity yet"
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <PeriodCard
            title="This week"
            description="ISO week cash and profit."
            href={`/reports/week/${week.year}/${week.week}`}
            cta="Open week"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <PeriodCard
            title="This month"
            description="The monthly overview you already know."
            href={`/reports/month/${year}/${month}`}
            cta="Open month"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <PeriodCard
            title="This quarter"
            description={`Q${quarter} ${year} roll-up.`}
            href={`/reports/quarter/${year}/${quarter}`}
            cta="Open quarter"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <PeriodCard
            title="This year"
            description={`${year} year-to-date.`}
            href={`/reports/year/${year}/1`}
            cta="Open year"
          />
        </Grid>
      </Grid>

      <MainCard title="Jump to a period" sx={{ mb: 3 }}>
        <Box
          component="form"
          action="/reports/go"
          sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <Box sx={{ minWidth: 160, flex: "1 1 160px" }}>
            <NativeSelect label="Report type" name="grain" defaultValue="month">
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
          <Box sx={{ minWidth: 160, flex: "1 1 160px" }}>
            <NativeSelect label="Week / month / quarter" name="part" defaultValue={String(month)}>
              {Array.from({ length: 53 }, (_, i) => i + 1).map((value) => (
                <option key={value} value={value}>
                  {value <= 12
                    ? `${value} (also ${monthName(value)} / Q${Math.ceil(value / 3)})`
                    : `Week ${value}`}
                </option>
              ))}
            </NativeSelect>
          </Box>
          <Button type="submit" variant="contained" color="primary">
            Show report
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, lineHeight: 1.5 }}>
          For weekly reports, pick the ISO week number (1 to 53). For quarters use 1 to 4. Yearly ignores the part field.
        </Typography>
      </MainCard>

      <MainCard content={false} title="Recent months">
        {keys.length === 0 ? (
          <Box sx={{ px: 2.5, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No monthly activity yet. Import historical data or create invoices to populate reports.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {keys.slice(0, 12).map((row) => {
              const overview = overall.series.find((s) => s.year === row.year && s.month === row.month)?.overview;
              return (
                <Stack
                  key={`${row.year}-${row.month}`}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    alignItems: { sm: "center" },
                    justifyContent: "space-between",
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    {monthName(row.month)} {row.year}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" className="fr-money">
                    Profit {formatMoney(overview?.profit.toNumber() ?? 0)}
                  </Typography>
                  <Link href={`/reports/month/${row.year}/${row.month}`}>
                    <Button size="small" variant="outlined">
                      Open
                    </Button>
                  </Link>
                </Stack>
              );
            })}
          </Stack>
        )}
      </MainCard>
    </Box>
  );
}

function PeriodCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <MainCard title={title}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.55, minHeight: 44 }}>
        {description}
      </Typography>
      <Link href={href}>
        <Button variant="contained" color="primary" fullWidth>
          {cta}
        </Button>
      </Link>
    </MainCard>
  );
}
