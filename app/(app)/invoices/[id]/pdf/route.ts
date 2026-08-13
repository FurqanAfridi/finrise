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
  const [branding, currency] = await Promise.all([
    getCompanyBranding(ctx.tenantId, ctx.tenantName),
    getSetting(ctx.tenantId, "currency", "USD"),
  ]);

  const pdf = await buildInvoicePdf(
    {
      invoiceNumber: invoice.invoiceNumber,
      periodLabel: invoice.periodLabel,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      leadCount: invoice.leadCount,
      rateType: invoice.rateType,
      rate: invoice.rate,
      revenue: invoice.revenue,
      receivable: invoice.receivable,
      paymentTermsDays: invoice.paymentTermsDays,
      comments: invoice.comments,
      buyerName: invoice.buyer.name,
      buyerEmail: billing[0]?.email ?? invoice.buyer.email,
      buyerAddress: billing[0]?.address ?? invoice.buyer.address,
      buyerContact: billing[0]?.contactName ?? invoice.buyer.contactName,
      verticalName: invoice.vertical?.name ?? null,
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
