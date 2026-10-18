import { notFound, redirect } from "next/navigation";
import { BuyerInvoiceForm } from "../invoice-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { getDirectoryOptions } from "@/lib/queries";
import { withPlainNumbers } from "@/lib/serialize";
import { listBuyerVerticalOffersByBuyer } from "@/lib/contact-verticals";
import {
  assertBuyerInvoiceAccess,
  canWrite,
  isBuyerPortal,
  requireTenant,
} from "@/lib/tenant";

export default async function EditBuyerInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  const { id } = await params;
  const invoice = await prisma.buyerInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!invoice) notFound();
  assertBuyerInvoiceAccess(ctx, invoice.buyerId);

  if (isBuyerPortal(ctx) || !canWrite(ctx.tenantRole, ctx.platformRole)) {
    redirect(`/invoices/${invoice.id}`);
  }

  const [options, lines] = await Promise.all([
    getDirectoryOptions(ctx.tenantId),
    prisma.buyerInvoiceLine.findMany({
      where: { tenantId: ctx.tenantId, buyerInvoiceId: invoice.id },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const buyerVerticalOffers = await listBuyerVerticalOffersByBuyer(
    ctx.tenantId,
    options.buyers.map((buyer) => buyer.id),
  );
  return (
    <div>
      <PageHeader title="Edit buyer invoice" description={invoice.invoiceNumber ?? invoice.periodLabel ?? ""} />
      <BuyerInvoiceForm
        invoice={withPlainNumbers(invoice)}
        lines={lines.map(withPlainNumbers)}
        buyers={options.buyers}
        verticals={options.verticals}
        buyerVerticalOffers={buyerVerticalOffers}
      />
    </div>
  );
}
