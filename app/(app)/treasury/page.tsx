import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { upsertBankAccount, upsertFxTransfer, upsertMonthReconciliation, upsertTreasuryCharge } from "@/app/actions/ops";
import { IncomeCard } from "@/components/berry/income-card";
import { MainCard } from "@/components/berry/main-card";
import { MonthSelect, NativeSelect, TextInput, YearSelect } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { displayDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";
import { num } from "@/lib/utils";
import { gridSpacing } from "@/theme/berry";
import { IconBuildingBank, IconCash, IconCreditCard, IconCurrencyDollar } from "@tabler/icons-react";

export default async function TreasuryPage() {
  const ctx = await requireBrokerOps();
  const now = new Date();
  const [charges, transfers, remaining, withdrawn, banks, recon, expensePaid] = await Promise.all([
    prisma.ccCharge.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.fxTransfer.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { createdAt: "desc" } }),
    getSetting(ctx.tenantId, "importedRemaining"),
    getSetting(ctx.tenantId, "importedWithdrawn"),
    prisma.bankAccount.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: "asc" } }),
    prisma.monthReconciliation.findMany({ where: { tenantId: ctx.tenantId }, orderBy: [{ year: "desc" }, { month: "desc" }] }),
    prisma.expense.aggregate({ where: { tenantId: ctx.tenantId }, _sum: { paid: true } }),
  ]);
  const statement = charges.filter((row) => row.kind === "STATEMENT").reduce((sum, row) => sum + num(row.amount), 0);
  const td = charges.filter((row) => row.kind === "TD").reduce((sum, row) => sum + num(row.amount), 0);
  const usd = transfers.reduce((sum, row) => sum + num(row.usd), 0);
  const pkr = transfers.reduce((sum, row) => sum + num(row.pkr), 0);

  return (
    <Box>
      <PageHeader title="Treasury" description="Card charges, TD draws, and PKR remittances." />
      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <IncomeCard label="CC statements" value={money(statement)} icon={<IconCreditCard />} />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <IncomeCard dark label="TD charged" value={money(td)} icon={<IconBuildingBank />} />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <IncomeCard label="FX USD out" value={money(usd)} hint={`PKR ${pkr.toLocaleString("en-US")}`} icon={<IconCurrencyDollar />} />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <IncomeCard label="Imported remaining" value={money(Number(remaining || 0))} hint={`Withdrawn ${money(Number(withdrawn || 0))}`} icon={<IconCash />} />
        </Grid>
      </Grid>

      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, xl: 6 }}>
          <MainCard title="Add card / TD charge" sx={{ mb: 3 }} contentSX={{ display: "grid", gap: 2, gridTemplateColumns: { md: "1fr 1fr" } }}>
            <Box component="form" action={upsertTreasuryCharge} sx={{ display: "contents" }}>
              <NativeSelect label="Kind" name="kind" defaultValue="STATEMENT">
                <option value="STATEMENT">Statement</option>
                <option value="TD">TD</option>
              </NativeSelect>
              <TextInput label="Month label" name="monthLabel" maxLength={40} />
              <TextInput label="Date" name="date" type="date" />
              <TextInput label="Amount" name="amount" required kind="decimal" maxDecimals={2} min={0} />
              <Button type="submit" variant="contained" color="secondary" sx={{ gridColumn: "1 / -1" }}>
                Add charge
              </Button>
            </Box>
          </MainCard>
          <MainCard content={false} title="Charges">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kind</TableCell>
                  <TableCell>Month</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {charges.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.kind}</TableCell>
                    <TableCell>{row.monthLabel ?? "—"}</TableCell>
                    <TableCell>{displayDate(row.date)}</TableCell>
                    <TableCell>{money(num(row.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MainCard>
        </Grid>
        <Grid size={{ xs: 12, xl: 6 }}>
          <MainCard title="Add FX transfer" sx={{ mb: 3 }} contentSX={{ display: "grid", gap: 2, gridTemplateColumns: { md: "1fr 1fr" } }}>
            <Box component="form" action={upsertFxTransfer} sx={{ display: "contents" }}>
              <TextInput label="Person" name="person" defaultValue="Rafia" kind="letters" maxLength={80} />
              <TextInput label="USD" name="usd" kind="decimal" maxDecimals={2} min={0} />
              <TextInput label="PKR" name="pkr" kind="decimal" maxDecimals={2} min={0} />
              <TextInput label="Rate" name="rate" kind="decimal" maxDecimals={6} min={0} />
              <TextInput label="Date" name="date" type="date" />
              <Button type="submit" variant="contained" color="secondary">
                Add transfer
              </Button>
            </Box>
          </MainCard>
          <MainCard content={false} title="FX transfers">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Person</TableCell>
                  <TableCell>USD</TableCell>
                  <TableCell>PKR</TableCell>
                  <TableCell>Rate</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.person}</TableCell>
                    <TableCell>{row.usd == null ? "—" : money(num(row.usd))}</TableCell>
                    <TableCell>{row.pkr == null ? "—" : num(row.pkr).toLocaleString("en-US")}</TableCell>
                    <TableCell>{row.rate == null ? "—" : num(row.rate)}</TableCell>
                    <TableCell>{displayDate(row.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MainCard>
        </Grid>
      </Grid>

      <Grid container spacing={gridSpacing} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <MainCard title="Bank account balance" contentSX={{ display: "grid", gap: 2 }}>
            <Box component="form" action={upsertBankAccount} sx={{ display: "grid", gap: 2 }}>
              <TextInput label="Account name" name="name" required maxLength={80} />
              <TextInput label="Balance" name="balance" required kind="decimal" maxDecimals={2} />
              <Button type="submit" variant="contained" color="secondary">
                Save balance
              </Button>
            </Box>
            {banks.map((row) => (
              <Box key={row.id} sx={{ display: "flex", justifyContent: "space-between" }}>
                <span>{row.name}</span>
                <strong>{money(num(row.balance))}</strong>
              </Box>
            ))}
          </MainCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MainCard title="Expense reconciliation" contentSX={{ display: "grid", gap: 2 }}>
            <Box component="form" action={upsertMonthReconciliation} sx={{ display: "grid", gap: 2 }}>
              <YearSelect name="year" required defaultValue={now.getUTCFullYear()} />
              <MonthSelect name="month" required defaultValue={now.getUTCMonth() + 1} />
              <TextInput label="Statement total" name="statementTotal" required kind="decimal" maxDecimals={2} min={0} />
              <Button type="submit" variant="contained" color="secondary">
                Save statement
              </Button>
            </Box>
            {recon.map((row) => (
              <Box key={row.id} sx={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {row.month}/{row.year} statement {money(num(row.statementTotal))}
                </span>
                <span>vs expenses paid {money(num(expensePaid._sum.paid))} · diff {money(num(row.statementTotal) - num(expensePaid._sum.paid))}</span>
              </Box>
            ))}
          </MainCard>
        </Grid>
      </Grid>
    </Box>
  );
}
