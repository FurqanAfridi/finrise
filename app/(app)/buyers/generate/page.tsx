import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GenerateInvoiceForm } from "../generate-form";
import { EmptyState } from "@/components/shared/empty-state";
import { MainCard } from "@/components/berry/main-card";
import { PageHeader } from "@/components/page-header";
import { getCompanyBranding, nextBuyerInvoiceNumber } from "@/lib/company-branding";
import { getDirectoryOptions } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";

export default async function GenerateBuyerInvoicePage() {
  const ctx = await requireBrokerOps();
  const [{ buyers, verticals }, nextNumber, branding] = await Promise.all([
    getDirectoryOptions(ctx.tenantId),
    nextBuyerInvoiceNumber(ctx.tenantId),
    getCompanyBranding(ctx.tenantId, ctx.tenantName),
  ]);

  return (
    <div>
      <PageHeader
        title="Create invoice"
        description="Four short steps. The invoice uses your company branding and bank details."
        actionHref="/settings?tab=branding"
        actionLabel="Invoice branding"
      />
      <MainCard sx={{ mb: 3 }} title="Sending as">
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          {branding.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoSrc} alt={branding.legalName} style={{ maxHeight: 48, maxWidth: 140, objectFit: "contain" }} />
          ) : null}
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{branding.legalName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {[branding.email, branding.phone].filter(Boolean).join(" · ") || "Add contact details in Settings"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Terms Net - {branding.defaultNetDays}
              {branding.hasBank ? " · Bank details on file" : " · Bank details missing"}
            </Typography>
          </Box>
        </Stack>
        {!branding.hasBank ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Add company bank details in Settings before sending. Buyers need them to pay.
          </Alert>
        ) : null}
      </MainCard>
      {buyers.length === 0 ? (
        <EmptyState
          title="Add a buyer first"
          description="You need at least one buyer contact before you can create an invoice."
          actionHref="/directory"
          actionLabel="Go to Contacts"
        />
      ) : (
        <GenerateInvoiceForm
          buyers={buyers}
          verticals={verticals}
          nextNumber={nextNumber}
          defaultNetDays={branding.defaultNetDays}
        />
      )}
    </div>
  );
}
