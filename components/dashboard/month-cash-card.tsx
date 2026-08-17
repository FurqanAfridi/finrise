import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MainCard } from "@/components/berry/main-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/money";
import { monthName } from "@/lib/utils";

export type MonthTrendRow = {
  label: string;
  year: number;
  month: number;
  received: number;
  paidOut: number;
  invoiced: number;
  expenses: number;
  publisherPaid: number;
  profit: number;
};

function barPct(value: number, max: number) {
  return `${Math.max((Math.abs(value) / max) * 100, 4)}%`;
}

export function MonthCashCard({
  trend,
  tenantName,
  unbilledAmount,
  unbilledCount,
}: {
  trend: MonthTrendRow[];
  tenantName: string;
  unbilledAmount: number;
  unbilledCount: number;
}) {
  const latest = trend[trend.length - 1];
  const max = Math.max(
    ...trend.flatMap((row) => [row.received, row.paidOut, Math.abs(row.profit)]),
    1,
  );

  return (
    <MainCard
      title="Cash this year"
      secondary={
        latest ? (
          <Link href={`/reports/monthly/${latest.year}/${latest.month}`} style={{ textDecoration: "none" }}>
            <Button size="small" color="primary" sx={{ minHeight: 44 }}>
              Monthly report
            </Button>
          </Link>
        ) : null
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.55 }}>
        Money in, money out, and profit for {tenantName}. Hover a bar to see that month.
      </Typography>
      {trend.length === 0 ? (
        <EmptyState
          title="No months yet"
          description="Create invoices and record payments to see profit here."
          actionHref="/buyers/generate"
          actionLabel="Create invoice"
        />
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 1.5, flexWrap: "wrap" }}>
            <Legend swatch="primary.main" label="Received" />
            <Legend swatch="info.main" label="Paid out" />
            <Legend swatch="success.main" label="Profit" />
          </Stack>
          <Box
            sx={{
              display: "flex",
              height: 220,
              alignItems: "flex-end",
              gap: { xs: 0.75, sm: 1.25 },
              overflowX: "auto",
              pb: 0.5,
            }}
          >
            {trend.map((row) => (
              <Box
                key={row.label}
                sx={{
                  flex: "1 0 36px",
                  minWidth: 36,
                  height: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "flex-end", gap: 0.25, height: 1, justifyContent: "center" }}
                  title={`${row.label}: received ${formatMoney(row.received)}, paid out ${formatMoney(row.paidOut)}, profit ${formatMoney(row.profit)}`}
                >
                  <Box
                    sx={{
                      flex: 1,
                      maxWidth: 10,
                      borderRadius: "6px 6px 0 0",
                      bgcolor: "primary.main",
                      height: barPct(row.received, max),
                      transition: "height 200ms ease",
                    }}
                  />
                  <Box
                    sx={{
                      flex: 1,
                      maxWidth: 10,
                      borderRadius: "6px 6px 0 0",
                      bgcolor: "info.main",
                      height: barPct(row.paidOut, max),
                      transition: "height 200ms ease",
                    }}
                  />
                  <Box
                    sx={{
                      flex: 1,
                      maxWidth: 10,
                      borderRadius: "6px 6px 0 0",
                      bgcolor: row.profit >= 0 ? "success.main" : "error.main",
                      height: barPct(row.profit, max),
                      transition: "height 200ms ease",
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
                  {row.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}

      {latest ? (
        <Stack spacing={1} sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {monthName(latest.month)} {latest.year}
          </Typography>
          <BreakdownRow label="Buyers invoiced" value={latest.invoiced} />
          <BreakdownRow label="Buyers paid in" value={latest.received} />
          <BreakdownRow label="Publisher payouts" value={latest.publisherPaid} />
          <BreakdownRow label="Expenses paid" value={latest.expenses} />
          <BreakdownRow label="Profit" value={latest.profit} emphasize />
          {unbilledCount > 0 ? (
            <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, py: 0.25 }}>
              <Typography variant="body2" color="text.secondary">
                <Link href="/figures?status=unbilled" style={{ color: "inherit" }}>
                  Unbilled daily figures ({unbilledCount})
                </Link>
              </Typography>
              <Typography className="fr-money" variant="body2" sx={{ fontWeight: 600 }}>
                {formatMoney(unbilledAmount)}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      ) : null}
    </MainCard>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: swatch }} aria-hidden />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

function BreakdownRow({ label, value, emphasize }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, py: 0.25 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography className="fr-money" variant="body2" sx={{ fontWeight: emphasize ? 700 : 600 }}>
        {formatMoney(value)}
      </Typography>
    </Stack>
  );
}
