import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { TenantRole } from "@prisma/client";
import { CompanyBankCompleteForm, CompanyExtrasForm, FinanceSettingsForm } from "@/components/company-extras-form";
import { InviteForm } from "@/components/invite-form";
import { PageHeader } from "@/components/page-header";
import { CompaniesPanel } from "@/components/settings/companies-panel";
import { ImportCsvWizard } from "@/components/settings/import-csv-wizard";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsHashRedirect } from "@/components/settings/hash-redirect";
import {
  LockedChip,
  SettingsPersonRow,
  SettingsRow,
  SettingsSection,
  SettingsTabs,
  SettingsValue,
} from "@/components/settings/settings-ui";
import { SmtpSettingsForm } from "@/components/smtp-form";
import { getCompanyBranding } from "@/lib/company-branding";
import { getFinanceSettings } from "@/lib/finance/queries";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/queries";
import { listInvoiceEmailLogs, listSmtpMailboxes } from "@/lib/smtp";
import { PERSONAL_SETTINGS_TABS, SETTINGS_TABS, parseSettingsTab } from "@/lib/settings-tabs";
import { TENANT_ROLE_LABEL } from "@/lib/status";
import { requireTenant, requireTenantAdmin } from "@/lib/tenant";
import { routingFieldLabel } from "@/lib/validation";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const tab = parseSettingsTab((await searchParams).tab);
  const personalTab = tab === "companies" || tab === "profile";
  const ctx = personalTab ? await requireTenant() : await requireTenantAdmin();
  const isAdmin = ctx.tenantRole === TenantRole.ADMIN || ctx.platformRole === "ADMIN";
  const visibleTabs = isAdmin ? SETTINGS_TABS : PERSONAL_SETTINGS_TABS;

  if (tab === "profile") {
    const userRows = await prisma.$queryRaw<{ name: string | null; email: string; avatarKey: string | null }[]>`
      SELECT name, email, "avatarKey" FROM "User" WHERE id = ${ctx.userId} LIMIT 1
    `;
    const user = userRows[0];
    return (
      <Box sx={{ maxWidth: 920 }}>
        <SettingsHashRedirect />
        <PageHeader title="Profile" description="Your name and avatar across FundLookup." />
        <SettingsTabs active={tab} tabs={visibleTabs} />
        <ProfileForm name={user?.name ?? null} email={user?.email ?? ctx.email} avatarKey={user?.avatarKey ?? null} />
      </Box>
    );
  }

  if (tab === "companies") {
    const memberships = await prisma.tenantMembership.findMany({
      where: { userId: ctx.userId },
      include: {
        tenant: {
          include: {
            _count: { select: { memberships: true } },
            memberships: { where: { role: TenantRole.ADMIN }, select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return (
      <Box sx={{ maxWidth: 920 }}>
        <SettingsHashRedirect />
        <PageHeader
          title="Companies"
          description="Switch between companies you belong to, or create another."
        />
        <SettingsTabs active={tab} tabs={visibleTabs} />
        <CompaniesPanel memberships={memberships} currentTenantId={ctx.tenantId} />
      </Box>
    );
  }

  const [currency, lastImportAt, users, invites, finance, branding, mailboxes, emailLogs] = await Promise.all([
    getSetting(ctx.tenantId, "currency", "USD"),
    getSetting(ctx.tenantId, "lastImportAt"),
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
    getFinanceSettings(ctx.tenantId),
    getCompanyBranding(ctx.tenantId, ctx.tenantName),
    listSmtpMailboxes(ctx.tenantId),
    listInvoiceEmailLogs(ctx.tenantId),
  ]);

  return (
    <Box sx={{ maxWidth: 920 }}>
      <SettingsHashRedirect />
      <PageHeader
        title={branding.legalName}
        description="Manage company details, invoice branding, email, and team for this company."
      />
      <SettingsTabs active={tab} tabs={visibleTabs} />

      {tab === "company" ? (
        <>
          <SettingsSection
            title="Company identity"
            description="Set at signup and printed on every invoice. These cannot be edited again."
          >
            <SettingsRow label="Company name" hint="Legal name buyers see on invoices." action={<LockedChip />}>
              <SettingsValue>{branding.legalName}</SettingsValue>
            </SettingsRow>
            <SettingsRow label="Email" hint="Company contact email printed on invoices." action={<LockedChip />}>
              <SettingsValue>{branding.email || "—"}</SettingsValue>
            </SettingsRow>
            <SettingsRow label="Phone" action={<LockedChip />}>
              <SettingsValue>{branding.phone || "—"}</SettingsValue>
            </SettingsRow>
            <SettingsRow label="Country" action={<LockedChip />}>
              <SettingsValue>{branding.countryLabel || "—"}</SettingsValue>
            </SettingsRow>
            <SettingsRow label="Address" align="start" action={<LockedChip />}>
              <SettingsValue>{branding.address || "—"}</SettingsValue>
            </SettingsRow>
            <SettingsRow label="Zip code" action={<LockedChip />}>
              <SettingsValue>{branding.zipCode || "—"}</SettingsValue>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            title="Bank account"
            description="Buyers use these details to pay invoices. Saved once, then locked."
          >
            {branding.hasBank ? (
              <>
                <SettingsRow label="Bank name" action={<LockedChip />}>
                  <SettingsValue>{branding.bankName}</SettingsValue>
                </SettingsRow>
                {branding.bankAccountNumber ? (
                  <SettingsRow label="Account number" action={<LockedChip />}>
                    <SettingsValue>{branding.bankAccountNumber}</SettingsValue>
                  </SettingsRow>
                ) : null}
                {branding.bankRoutingNumber ? (
                  <SettingsRow label={routingFieldLabel(branding.country || "")} action={<LockedChip />}>
                    <SettingsValue>{branding.bankRoutingNumber}</SettingsValue>
                  </SettingsRow>
                ) : null}
                {branding.bankIban ? (
                  <SettingsRow label="IBAN" action={<LockedChip />}>
                    <SettingsValue>{branding.bankIban}</SettingsValue>
                  </SettingsRow>
                ) : null}
                {branding.bankSwift ? (
                  <SettingsRow label="SWIFT / BIC" action={<LockedChip />}>
                    <SettingsValue>{branding.bankSwift}</SettingsValue>
                  </SettingsRow>
                ) : null}
              </>
            ) : (
              <CompanyBankCompleteForm
                country={branding.country || "US"}
                defaults={{
                  bankName: branding.bankName,
                  bankAccountNumber: branding.bankAccountNumber,
                  bankRoutingNumber: branding.bankRoutingNumber,
                  bankIban: branding.bankIban,
                  bankSwift: branding.bankSwift,
                }}
              />
            )}
          </SettingsSection>
        </>
      ) : null}

      {tab === "branding" ? (
        <CompanyExtrasForm
          website={branding.website}
          taxId={branding.taxId}
          paymentNotes={branding.paymentNotes}
          invoiceColor={branding.invoiceColor}
          defaultNetDays={branding.defaultNetDays}
          termsAndConditions={branding.termsAndConditions}
          logoSrc={branding.logoSrc}
          hasLogo={branding.hasLogo}
        />
      ) : null}

      {tab === "email" ? (
        <>
          <SmtpSettingsForm mailboxes={mailboxes} />
          <SettingsSection
            title="Send log"
            description="Every invoice email and test message for this company."
          >
            {emailLogs.length === 0 ? (
              <Box sx={{ px: 3, py: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  No emails sent yet. Save the mailbox, then use Email buyer on an invoice.
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emailLogs.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{row.toEmail}</TableCell>
                      <TableCell>{row.invoiceNumber ?? "Test"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.status === "SENT" ? "Sent" : "Failed"}
                          sx={{
                            fontWeight: 600,
                            bgcolor: row.status === "SENT" ? "var(--fr-success-muted)" : "var(--fr-danger-muted)",
                            color: row.status === "SENT" ? "var(--fr-success)" : "var(--fr-danger)",
                          }}
                        />
                        {row.error ? (
                          <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                            {row.error}
                          </Typography>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SettingsSection>
        </>
      ) : null}

      {tab === "finance" ? (
        <FinanceSettingsForm
          currency={currency}
          taxRatePercent={finance.taxRatePercent.toNumber()}
          taxOrder={finance.taxOrder}
          varianceToleranceAmount={finance.varianceToleranceAmount.toNumber()}
          fiscalMonthStartDay={finance.fiscalMonthStartDay}
          lastImportAt={lastImportAt}
        />
      ) : null}

      {tab === "team" ? (
        <>
          <InviteForm />
          <SettingsSection title="People" description="Everyone who can open this company in Finrise.">
            {users.map((row) => (
              <SettingsPersonRow
                key={row.id}
                name={row.user.name || row.user.email}
                email={row.user.email}
                action={
                  <Chip
                    size="small"
                    variant="outlined"
                    label={TENANT_ROLE_LABEL[row.role]}
                    sx={{ fontWeight: 600 }}
                  />
                }
              />
            ))}
          </SettingsSection>
          <SettingsSection
            title="Recent invites"
            description="Links stay open until used or expired. Invitation emails are sent from the platform mailbox."
          >
            {invites.length === 0 ? (
              <Box sx={{ px: 3, py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No invites yet.
                </Typography>
              </Box>
            ) : (
              invites.map((invite) => (
                <SettingsPersonRow
                  key={invite.id}
                  name={invite.email}
                  email={`/invite/${invite.token}`}
                  action={
                    <Chip
                      size="small"
                      variant="outlined"
                      label={invite.usedAt ? "Used" : "Open"}
                      color={invite.usedAt ? "default" : "success"}
                      sx={{ fontWeight: 600 }}
                    />
                  }
                />
              ))
            )}
          </SettingsSection>
        </>
      ) : null}

      {tab === "import" ? <ImportCsvWizard /> : null}
    </Box>
  );
}
