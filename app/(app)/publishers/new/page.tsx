import { PublisherInvoiceForm } from "../invoice-form";
import { PageHeader } from "@/components/page-header";
import { listPublisherVerticalOffersByPublisher } from "@/lib/contact-verticals";
import { getDirectoryOptions } from "@/lib/queries";
import { isPublisherPortal, requireBrokerOps, requireTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function NewPublisherInvoicePage() {
  const ctx = await requireTenant();

  if (isPublisherPortal(ctx)) {
    if (!ctx.linkedPublisherId) redirect("/publishers");
    const { verticals, publishers } = await getDirectoryOptions(ctx.tenantId);
    const mine = publishers.filter((row) => row.id === ctx.linkedPublisherId);
    const publisherVerticalOffers = await listPublisherVerticalOffersByPublisher(ctx.tenantId, [ctx.linkedPublisherId]);
    return (
      <div>
        <PageHeader
          title="Create invoice"
          description="Bill this company for your traffic. Revenue is lead count × lead cost unless you click Edit."
        />
        <PublisherInvoiceForm
          publishers={mine}
          verticals={verticals}
          publisherVerticalOffers={publisherVerticalOffers}
          lockedPublisherId={ctx.linkedPublisherId}
          submitLabel="Create invoice"
        />
      </div>
    );
  }

  await requireBrokerOps();
  const { publishers, verticals } = await getDirectoryOptions(ctx.tenantId);
  const publisherVerticalOffers = await listPublisherVerticalOffersByPublisher(
    ctx.tenantId,
    publishers.map((publisher) => publisher.id),
  );
  return (
    <div>
      <PageHeader title="New publisher payable" description="Add a traffic-source payable." />
      <PublisherInvoiceForm
        publishers={publishers}
        verticals={verticals}
        publisherVerticalOffers={publisherVerticalOffers}
      />
    </div>
  );
}
