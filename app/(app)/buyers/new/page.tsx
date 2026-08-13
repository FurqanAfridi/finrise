import { BuyerInvoiceForm } from "../invoice-form";
import { PageHeader } from "@/components/page-header";
import { getDirectoryOptions } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";

export default async function NewBuyerInvoicePage() {
  const ctx = await requireBrokerOps();
  const { buyers, verticals } = await getDirectoryOptions(ctx.tenantId);
  return (
    <div>
      <PageHeader title="New buyer invoice" description="Add a receivable to the buyers ledger." />
      <BuyerInvoiceForm buyers={buyers} verticals={verticals} />
    </div>
  );
}
