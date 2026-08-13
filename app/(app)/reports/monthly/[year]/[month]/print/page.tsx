import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { computeTenantMonth, loadMonthlyLines } from "@/lib/finance/queries";
import { money } from "@/lib/money";
import { requireBrokerOps } from "@/lib/tenant";
import { monthName } from "@/lib/utils";

export default async function PrintMonthlyPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const ctx = await requireBrokerOps();
  const { year, month } = await params;
  const y = Number(year);
  const m = Number(month);
  const [{ overview, distribution }, lines] = await Promise.all([
    computeTenantMonth(ctx.tenantId, y, m),
    loadMonthlyLines(ctx.tenantId, y, m),
  ]);

  return (
    <Box sx={{ p: 4, bgcolor: "white", color: "black" }}>
      <Typography variant="h3">
        {ctx.tenantName} · {monthName(m)} {y}
      </Typography>
      <Typography sx={{ mt: 2 }}>
        Revenue {money(overview.revenue.toNumber())} · {overview.profitLabel}{" "}
        {money(overview.profit.toNumber())} · Margin{" "}
        {overview.marginPercent ? `${overview.marginPercent.toFixed(2)}%` : "n/a"}
      </Typography>
      <Typography>
        Expected {money(overview.expectedProfit.toNumber())} · Tax{" "}
        {money(distribution?.taxReserve.toNumber() ?? 0)} · Distributable{" "}
        {money(distribution?.afterTax.toNumber() ?? 0)}
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Typography variant="h5">Publishers</Typography>
        {lines.publishers.map((row) => (
          <Typography key={row.id}>
            {row.name}: actual {money(row.actual.toNumber())} paid {money(row.paid.toNumber())}
          </Typography>
        ))}
        <Typography variant="h5" sx={{ mt: 2 }}>
          Buyers
        </Typography>
        {lines.buyers.map((row) => (
          <Typography key={row.id}>
            {row.name}: actual {money(row.actual.toNumber())} received {money(row.received.toNumber())}
          </Typography>
        ))}
        <Typography variant="h5" sx={{ mt: 2 }}>
          Expenses
        </Typography>
        {lines.expenses.map((row) => (
          <Typography key={row.id}>
            {row.label}: actual {money(row.actual.toNumber())} paid {money(row.paid.toNumber())}
          </Typography>
        ))}
      </Box>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.addEventListener('load',()=>window.print())",
        }}
      />
    </Box>
  );
}
