import { notFound, redirect } from "next/navigation";
import Box from "@mui/material/Box";
import { PublisherInvoiceForm } from "../invoice-form";
import { SendPublisherInvoiceButton } from "@/components/publisher-send-invoice";
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
  const invoice = await prisma.publisherInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { publisher: true },
  });
  if (!invoice) notFound();
  assertPublisherInvoiceAccess(ctx, invoice.publisherId);

  const portal = isPublisherPortal(ctx);
  const writer = canWrite(ctx.tenantRole, ctx.platformRole);

  if (!portal && !writer) {
    redirect("/publishers");
  }

  const options = await getDirectoryOptions(ctx.tenantId);
  return (
    <div>
      <PageHeader
        title={portal ? "Your invoice" : "Edit publisher payable"}
        description={invoice.invoiceNumber ?? invoice.periodLabel ?? ""}
      >
        {portal ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            <SendPublisherInvoiceButton invoiceId={invoice.id} />
          </Box>
        ) : null}
      </PageHeader>
      <PublisherInvoiceForm
        invoice={invoice}
        publishers={options.publishers}
        verticals={options.verticals}
        lockedPublisherId={portal ? ctx.linkedPublisherId ?? undefined : undefined}
        submitLabel={portal ? "Save invoice" : undefined}
      />
    </div>
  );
}
