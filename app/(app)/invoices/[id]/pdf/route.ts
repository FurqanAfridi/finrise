import { buildBuyerInvoiceDeliveryContext, toBuyerInvoiceDeliveryPayload } from "@/lib/buyer-invoice-delivery";
import { getCompanyBranding } from "@/lib/company-branding";
import { buildInvoicePdf, invoicePdfFilename } from "@/lib/invoice-pdf";
import { getSetting } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { assertBuyerInvoiceAccess, isPublisherPortal, requireTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenant();
  if (isPublisherPortal(ctx)) redirect("/publishers");
  const { id } = await context.params;
  const invoice = await prisma.buyerInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { buyer: true, vertical: true },
  });
  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }
  assertBuyerInvoiceAccess(ctx, invoice.buyerId);

  const billing = await prisma.$queryRaw<{ email: string | null; address: string | null; contactName: string | null }[]>`
    SELECT email, address, "contactName" FROM "Buyer" WHERE id = ${invoice.buyerId} LIMIT 1
  `;
  const [branding, currency, deliveryContext] = await Promise.all([
    getCompanyBranding(ctx.tenantId, ctx.tenantName),
    getSetting(ctx.tenantId, "currency", "USD"),
    buildBuyerInvoiceDeliveryContext(ctx.tenantId, invoice, billing[0]),
  ]);
  const payload = toBuyerInvoiceDeliveryPayload(invoice, deliveryContext);

  const pdf = await buildInvoicePdf(
    {
      invoiceNumber: payload.invoiceNumber,
      periodLabel: payload.periodLabel,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      dueDate: payload.dueDate,
      createdAt: payload.createdAt,
      revenue: payload.revenue,
      receivable: payload.receivable,
      paymentTermsDays: payload.paymentTermsDays,
      comments: payload.comments,
      buyerName: payload.buyerName,
      buyerEmails: payload.buyerEmails,
      buyerAddress: payload.buyerAddress,
      buyerContact: payload.buyerContact,
      verticalName: payload.verticalName,
      lines: payload.lines,
    },
    branding,
    currency,
  );

  const filename = invoicePdfFilename(invoice.invoiceNumber);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
