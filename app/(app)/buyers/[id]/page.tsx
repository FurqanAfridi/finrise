import { notFound, redirect } from "next/navigation";
import { BuyerInvoiceForm } from "../invoice-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { getDirectoryOptions } from "@/lib/queries";
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

  const options = await getDirectoryOptions(ctx.tenantId);
  return (
    <div>
      <PageHeader title="Edit buyer invoice" description={invoice.invoiceNumber ?? invoice.periodLabel ?? ""} />
      <BuyerInvoiceForm invoice={invoice} buyers={options.buyers} verticals={options.verticals} />
    </div>
  );
}
