import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { TenantRole } from "@prisma/client";
import { CompanyBankCompleteForm, CompanyCardForm, CompanyExtrasForm, CompanyIdentityForm, FinanceSettingsForm } from "@/components/company-extras-form";
import { InviteForm } from "@/components/invite-form";
import { PageHeader } from "@/components/page-header";
import { CompaniesPanel } from "@/components/settings/companies-panel";
import { HistoricalImportWizard } from "@/components/integrations/historical-import-wizard";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsHashRedirect } from "@/components/settings/hash-redirect";
import {
  SettingsPersonRow,
  SettingsSection,
  SettingsTabs,
} from "@/components/settings/settings-ui";
import { SmtpSettingsForm } from "@/components/smtp-form";
import { getCompanyBranding } from "@/lib/company-branding";
import { getGoogleSheetsConnection } from "@/lib/google-sheets";
import { getFinanceSettings } from "@/lib/finance/queries";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/queries";
import { listInvoiceEmailLogs, listSmtpMailboxes } from "@/lib/smtp";
import { PERSONAL_SETTINGS_TABS, SETTINGS_TABS, parseSettingsTab } from "@/lib/settings-tabs";
import { TENANT_ROLE_LABEL } from "@/lib/status";
import { requireTenant, requireTenantAdmin } from "@/lib/tenant";

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
      <Box sx={{ width: "100%", maxWidth: "100%" }}>
        <SettingsHashRedirect />
        <PageHeader title="Profile" description="Your name and avatar across Fundlookup." />
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
      <Box sx={{ width: "100%", maxWidth: "100%" }}>
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

  const [currency, lastImportAt, users, invites, finance, branding, mailboxes, emailLogs, googleSheets] = await Promise.all([
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
    getGoogleSheetsConnection(ctx.tenantId),
  ]);

  return (
    <Box sx={{ width: "100%", maxWidth: "100%" }}>
      <SettingsHashRedirect />
      <PageHeader
        title={branding.legalName}
        description="Manage company details, invoice branding, email, and team for this company."
      />
      <SettingsTabs active={tab} tabs={visibleTabs} />

      {tab === "company" ? (
        <>
          <CompanyIdentityForm
            defaults={{
              name: branding.legalName,
              email: branding.email,
              phone: branding.phone,
              country: branding.country,
              address: branding.address,
              zipCode: branding.zipCode,
            }}
          />

          <SettingsSection
            title="Bank account"
            description="Buyers can pay invoices by bank transfer using these details."
          >
            <CompanyBankCompleteForm
              country={branding.country || "US"}
              hasBank={branding.hasBank}
              defaults={{
                bankName: branding.bankName,
                bankAccountNumber: branding.bankAccountNumber,
                bankRoutingNumber: branding.bankRoutingNumber,
                bankIban: branding.bankIban,
                bankSwift: branding.bankSwift,
              }}
            />
          </SettingsSection>

          <SettingsSection
            title="Credit card"
            description="Optional. Buyers can also pay using the company card printed on the invoice."
          >
            <CompanyCardForm
              hasCard={branding.hasCard}
              defaults={{
                cardHolderName: branding.cardHolderName,
                cardBrand: branding.cardBrand,
                cardNumber: branding.cardNumber,
                cardExpiry: branding.cardExpiry,
              }}
            />
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
          invoiceEmail={branding.invoiceEmail}
          invoicePhone={branding.invoicePhone}
          invoiceRepresentativeName={branding.invoiceRepresentativeName}
          companyEmail={branding.email}
          companyPhone={branding.phone}
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
          <SettingsSection title="People" description="Everyone who can open this company in Fundlookup.">
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

      {tab === "import" ? <HistoricalImportWizard googleConnected={Boolean(googleSheets)} /> : null}
    </Box>
  );
}
