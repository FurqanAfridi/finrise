import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { AvailableBalanceCard } from "@/components/balance/available-balance-card";
import { MainCard } from "@/components/berry/main-card";
import { NativeSelect, TextInput } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { KpiCard } from "@/components/shared/kpi-card";
import { displayDate } from "@/lib/dates";
import {
  buildCashLedger,
  CASH_LEDGER_KIND_LABEL,
  parseCashLedgerParams,
  type CashLedgerKind,
} from "@/lib/finance/cash-ledger";
import { computeMonthlyOverview, expectedBalance } from "@/lib/finance/monthlyOverview";
import {
  getAvailableBalance,
  loadAllTimeTotals,
  loadCashLedgerEntries,
  loadOpenBalances,
} from "@/lib/finance/queries";
import { formatMoney } from "@/lib/money";
import { canWrite, requireBrokerOps } from "@/lib/tenant";
import { gridSpacing } from "@/theme/berry";

const NUMBER_CELL = { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } as const;

function signedMoney(value: number) {
  return (
    <Box component="span" sx={{ color: value < 0 ? "error.main" : undefined, fontWeight: 600 }}>
      {formatMoney(value)}
    </Box>
  );
}

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireBrokerOps();
  const params = await searchParams;
  const filters = parseCashLedgerParams(params);

  const [entries, open, allTime, bank] = await Promise.all([
    loadCashLedgerEntries(ctx.tenantId),
    loadOpenBalances(ctx.tenantId),
    loadAllTimeTotals(ctx.tenantId),
    getAvailableBalance(ctx.tenantId),
  ]);

  const ledger = buildCashLedger(entries, {
    from: filters.from,
    to: filters.to,
    kinds: filters.kind ? [filters.kind] : undefined,
  });

  const recorded = ledger.availableBalance.toNumber();
  const entered = bank.amount?.toNumber() ?? null;
  const toCollect = open.toCollect.toNumber();
  const toPay = open.toPay.add(open.expensesToPay).toNumber();
  const profit = computeMonthlyOverview(allTime).profit.toNumber();
  const expected = expectedBalance({ profit, toCollect, toPay });

  const query: Record<string, string> = {};
  if (filters.fromValue) query.from = filters.fromValue;
  if (filters.toValue) query.to = filters.toValue;
  if (filters.kind) query.kind = filters.kind;
  const chips = [
    filters.fromValue ? { key: "from", label: `From ${displayDate(filters.from)}` } : null,
    filters.toValue ? { key: "to", label: `To ${displayDate(filters.toValue)}` } : null,
    filters.kind ? { key: "kind", label: `Type: ${CASH_LEDGER_KIND_LABEL[filters.kind]}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];
  const csvHref = `/balance/csv${Object.keys(query).length ? `?${new URLSearchParams(query)}` : ""}`;
  const ranged = Boolean(filters.from || filters.to || filters.kind);
  const showBroughtForward = Boolean(filters.from);

  return (
    <Box>
      <PageHeader
        title="Balance"
        description="Every dollar in and out with a running balance, like a bank sheet."
      >
        <Button component="a" href={csvHref} variant="outlined" color="primary">
          Download for Excel
        </Button>
      </PageHeader>

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <AvailableBalanceCard
            amount={entered}
            updatedLabel={
              bank.updatedAt
                ? `Updated ${displayDate(bank.updatedAt)}${bank.updatedBy ? ` by ${bank.updatedBy}` : ""}`
                : null
            }
            recorded={recorded}
            canEdit={canWrite(ctx.tenantRole, ctx.platformRole)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label={ranged ? "Money in (filtered)" : "Total money in"}
            value={formatMoney(ledger.totalIn.toNumber())}
            subtitle="Buyer payments received."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label={ranged ? "Money out (filtered)" : "Total money out"}
            value={formatMoney(ledger.totalOut.toNumber())}
            subtitle="Publisher payments, expenses, and partner withdrawals."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Expected balance"
            value={formatMoney(expected)}
            subtitle={`Profit ${formatMoney(profit)} + ${formatMoney(toCollect)} still to collect − ${formatMoney(toPay)} still to pay.`}
          />
        </Grid>
      </Grid>

      <FilterBar basePath="/balance" query={query} chips={chips}>
        <TextInput label="From" name="from" type="date" defaultValue={filters.fromValue} />
        <TextInput label="To" name="to" type="date" defaultValue={filters.toValue} />
        <NativeSelect label="Type" name="kind" defaultValue={filters.kind ?? ""}>
          <option value="">Everything</option>
          {(Object.keys(CASH_LEDGER_KIND_LABEL) as CashLedgerKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {CASH_LEDGER_KIND_LABEL[kind]}
            </option>
          ))}
        </NativeSelect>
      </FilterBar>

      <MainCard content={false} title="Cash sheet" sx={{ mb: 3 }}>
        {ledger.rows.length === 0 && !showBroughtForward ? (
          <EmptyState
            title="No money movements yet"
            description="Payments show up here once a buyer invoice has money received, a publisher payment is approved, an expense is paid, or a partner withdraws."
          />
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Money in</TableCell>
                  <TableCell align="right">Money out</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {showBroughtForward ? (
                  <TableRow>
                    <TableCell sx={NUMBER_CELL}>{displayDate(filters.from)}</TableCell>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Brought forward
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={NUMBER_CELL}>
                      {signedMoney(ledger.broughtForward.toNumber())}
                    </TableCell>
                  </TableRow>
                ) : null}
                {ledger.rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={NUMBER_CELL}>{displayDate(row.date)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{CASH_LEDGER_KIND_LABEL[row.kind]}</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      {row.href ? (
                        <Link href={row.href} style={{ color: "inherit" }}>
                          {row.description}
                        </Link>
                      ) : (
                        row.description
                      )}
                      {row.reference ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {row.reference}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right" sx={{ ...NUMBER_CELL, color: "success.main" }}>
                      {row.moneyIn.gt(0) ? formatMoney(row.moneyIn.toNumber()) : ""}
                    </TableCell>
                    <TableCell align="right" sx={NUMBER_CELL}>
                      {row.moneyOut.gt(0) ? formatMoney(row.moneyOut.toNumber()) : ""}
                    </TableCell>
                    <TableCell align="right" sx={NUMBER_CELL}>
                      {signedMoney(row.balance.toNumber())}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ "& td": { fontWeight: 700, borderTop: 2, borderColor: "divider" } }}>
                  <TableCell colSpan={3}>Totals</TableCell>
                  <TableCell align="right" sx={NUMBER_CELL}>
                    {formatMoney(ledger.totalIn.toNumber())}
                  </TableCell>
                  <TableCell align="right" sx={NUMBER_CELL}>
                    {formatMoney(ledger.totalOut.toNumber())}
                  </TableCell>
                  <TableCell align="right" sx={NUMBER_CELL}>
                    {signedMoney(ledger.closingBalance.toNumber())}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MainCard>

    </Box>
  );
}
