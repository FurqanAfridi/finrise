import { PublisherInvoiceForm } from "../invoice-form";
import { PageHeader } from "@/components/page-header";
import { getDirectoryOptions } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";

export default async function NewPublisherInvoicePage() {
  const ctx = await requireBrokerOps();
  const { publishers, verticals } = await getDirectoryOptions(ctx.tenantId);
  return (
    <div>
      <PageHeader title="New publisher payable" description="Add a traffic-source payable." />
      <PublisherInvoiceForm publishers={publishers} verticals={verticals} />
    </div>
  );
}
