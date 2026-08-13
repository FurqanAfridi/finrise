import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { PartnerTier } from "@prisma/client";
import { recordWithdrawal, upsertPartner } from "@/app/actions/ops";
import { IncomeCard } from "@/components/berry/income-card";
import { MainCard } from "@/components/berry/main-card";
import { TaxCard } from "@/components/finance-cards";
import { NativeSelect, TextInput } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { displayDate } from "@/lib/dates";
import { money as d } from "@/lib/finance/decimal";
import { partnerLedger } from "@/lib/finance/partnerLedger";
import { partnerConfigIssue, tryDistributeProfit } from "@/lib/finance/profitDistribution";
import { getActivePartners, getFinanceSettings, overallProfit } from "@/lib/finance/queries";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireBrokerOps } from "@/lib/tenant";
import { gridSpacing } from "@/theme/berry";
import { IconCash } from "@tabler/icons-react";

export default async function PartnersPage() {
  const ctx = await requireBrokerOps();
  const [partners, settings, profit, withdrawals] = await Promise.all([
    getActivePartners(ctx.tenantId),
    getFinanceSettings(ctx.tenantId),
    overallProfit(ctx.tenantId),
    prisma.partnerWithdrawal.findMany({
      where: { tenantId: ctx.tenantId },
      include: { partner: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const configIssue = partnerConfigIssue(partners);
  const entitled: Record<string, ReturnType<typeof d>> = {};
  if (!configIssue) {
    for (const row of profit.series) {
      const dist = tryDistributeProfit(row.overview.profit, partners, settings);
      if (!dist) continue;
      for (const share of [...dist.tier1, ...dist.tier2]) {
        entitled[share.partnerId] = (entitled[share.partnerId] ?? d(0)).add(share.amount);
      }
    }
  }
  const withdrawn: Record<string, ReturnType<typeof d>> = {};
  for (const row of withdrawals) {
    withdrawn[row.partnerId] = (withdrawn[row.partnerId] ?? d(0)).add(d(row.amountBase.toString()));
  }
  const ledger = partnerLedger(partners, entitled, withdrawn);
  const latestDist =
    !configIssue && profit.series[0]
      ? tryDistributeProfit(profit.series[0].overview.profit, partners, settings)
      : null;

  const equityTotal = partners
    .filter((partner) => partner.tier === PartnerTier.EQUITY)
    .reduce((sum, partner) => sum + Number(partner.sharePercent), 0);

  return (
    <Box>
      <PageHeader
        title="Partners"
        description="Top-line and equity split after the tax reserve. Available balance can go negative."
        actionHref="/payouts"
        actionLabel="Payouts"
      />

      {configIssue ? (
        <Box
          sx={{
            mb: 3,
            px: 2.5,
            py: 2,
            borderRadius: 2,
            bgcolor: "var(--fr-warning-muted)",
            border: "1px solid",
            borderColor: "warning.main",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: "warning.dark", mb: 0.5 }}>
            Profit split paused
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {configIssue}
            {partners.some((p) => p.tier === PartnerTier.EQUITY)
              ? ` Equity total right now: ${equityTotal.toFixed(2)}%.`
              : ""}
          </Typography>
        </Box>
      ) : null}

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        {ledger.map((row) => (
          <Grid key={row.partnerId} size={{ xs: 12, md: 4 }}>
            <IncomeCard
              label={row.name}
              value={money(row.availableBalance.toNumber())}
              hint={`Entitled ${money(row.entitledToDate.toNumber())} · withdrawn ${money(row.withdrawnToDate.toNumber())}`}
              icon={<IconCash />}
            />
          </Grid>
        ))}
        {latestDist ? (
          <Grid size={{ xs: 12, md: 4 }}>
            <TaxCard
              profit={latestDist.profit.toNumber()}
              taxReserve={latestDist.taxReserve.toNumber()}
              taxRate={settings.taxRatePercent.toNumber()}
              distributable={latestDist.afterTax.toNumber()}
            />
          </Grid>
        ) : null}
      </Grid>

      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 6 }}>
          <MainCard title="Add / update partner" contentSX={{ display: "grid", gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
              Equity partners together must total 100%. Top-line partners take a percent before the equity split.
            </Typography>
            <Box component="form" action={upsertPartner} sx={{ display: "grid", gap: 2 }}>
              <TextInput label="Name" name="name" required kind="letters" maxLength={80} />
              <NativeSelect label="Tier" name="tier" defaultValue="EQUITY">
                <option value="TOP_LINE">Top-line %</option>
                <option value="EQUITY">Equity %</option>
              </NativeSelect>
              <TextInput
                label="Share percent"
                name="sharePercent"
                required
                kind="decimal"
                maxDecimals={2}
                min={1}
                max={100}
                helperText="Each share must be between 1 and 100. Equity partners must total 100%."
              />
              <Button type="submit" variant="contained" color="secondary">
                Save partner
              </Button>
            </Box>
          </MainCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MainCard title="Record withdrawal" contentSX={{ display: "grid", gap: 2 }}>
            <Box component="form" action={recordWithdrawal} sx={{ display: "grid", gap: 2 }}>
              <NativeSelect label="Partner" name="partnerId" required>
                <option value="">Select</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </NativeSelect>
              <TextInput label="USD amount" name="amountBase" required kind="decimal" maxDecimals={2} min={0.01} />
              <TextInput label="Date" name="date" type="date" />
              <TextInput label="Method" name="method" maxLength={80} />
              <TextInput label="Target currency" name="targetCurrency" defaultValue="PKR" kind="currency" />
              <TextInput label="Conversion rate" name="conversionRate" kind="decimal" maxDecimals={6} min={0} />
              <TextInput label="Note" name="note" maxLength={200} />
              <Button type="submit" variant="contained" color="secondary">
                Record withdrawal
              </Button>
            </Box>
          </MainCard>
        </Grid>
      </Grid>

      <MainCard content={false} title="Partner roster" sx={{ mt: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell>{partner.name}</TableCell>
                <TableCell>{partner.tier === PartnerTier.TOP_LINE ? "Top-line" : "Equity"}</TableCell>
                <TableCell>{partner.sharePercent.toString()}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MainCard>

      <MainCard content={false} title="Withdrawal ledger" sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Partner</TableCell>
              <TableCell>USD</TableCell>
              <TableCell>Converted</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {withdrawals.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.partner.name}</TableCell>
                <TableCell>{money(Number(row.amountBase))}</TableCell>
                <TableCell>
                  {row.amountConverted != null
                    ? `${Number(row.amountConverted).toLocaleString()} ${row.targetCurrency ?? ""} @ ${row.conversionRate ?? "—"}`
                    : "—"}
                </TableCell>
                <TableCell>{displayDate(row.date)}</TableCell>
                <TableCell>{row.note ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MainCard>
    </Box>
  );
}
