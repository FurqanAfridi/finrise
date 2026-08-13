import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import { BuyerInvoiceDocument } from "@/components/buyer-invoice-document";
import { InvoicePrintToolbar } from "@/components/invoice-print-toolbar";
import { getCompanyBranding } from "@/lib/company-branding";
import { getSetting } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { listSmtpMailboxes } from "@/lib/smtp";
import { assertBuyerInvoiceAccess, canWrite, requireTenant } from "@/lib/tenant";

export default async function BuyerInvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  const { id } = await params;
  const invoice = await prisma.buyerInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { buyer: true, vertical: true },
  });
  if (!invoice) notFound();
  assertBuyerInvoiceAccess(ctx, invoice.buyerId);

  const writer = canWrite(ctx.tenantRole, ctx.platformRole);
  const [branding, currency, billing, mailboxes] = await Promise.all([
    getCompanyBranding(ctx.tenantId, ctx.tenantName),
    getSetting(ctx.tenantId, "currency", "USD"),
    prisma.$queryRaw<{ email: string | null; address: string | null; contactName: string | null }[]>`
      SELECT email, address, "contactName" FROM "Buyer" WHERE id = ${invoice.buyerId} LIMIT 1
    `,
    writer ? listSmtpMailboxes(ctx.tenantId) : Promise.resolve([]),
  ]);
  const billTo = billing[0];
  const document = {
    ...invoice,
    buyer: {
      ...invoice.buyer,
      email: billTo?.email ?? invoice.buyer.email ?? null,
      address: billTo?.address ?? invoice.buyer.address ?? null,
      contactName: billTo?.contactName ?? invoice.buyer.contactName ?? null,
    },
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#eef2f6", py: 3, "@media print": { bgcolor: "#fff", py: 0 } }}>
      <InvoicePrintToolbar invoiceId={invoice.id} sent={invoice.invoiceStatus === "SENT"} mailboxes={mailboxes} />
      <BuyerInvoiceDocument invoice={document} branding={branding} currency={currency} />
    </Box>
  );
}
