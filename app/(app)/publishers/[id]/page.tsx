import { notFound, redirect } from "next/navigation";
import { PublisherInvoiceForm } from "../invoice-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { getDirectoryOptions } from "@/lib/queries";
import {
  assertPublisherInvoiceAccess,
  canWrite,
  isPublisherPortal,
  requireTenant,
} from "@/lib/tenant";

export default async function EditPublisherInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  const { id } = await params;
  const invoice = await prisma.publisherInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!invoice) notFound();
  assertPublisherInvoiceAccess(ctx, invoice.publisherId);

  if (isPublisherPortal(ctx) || !canWrite(ctx.tenantRole, ctx.platformRole)) {
    redirect("/publishers");
  }

  const options = await getDirectoryOptions(ctx.tenantId);
  return (
    <div>
      <PageHeader title="Edit publisher payable" description={invoice.invoiceNumber ?? invoice.periodLabel ?? ""} />
      <PublisherInvoiceForm
        invoice={invoice}
        publishers={options.publishers}
        verticals={options.verticals}
      />
    </div>
  );
}
