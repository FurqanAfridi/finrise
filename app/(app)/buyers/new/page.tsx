import { BuyerInvoiceForm } from "../invoice-form";
import { PageHeader } from "@/components/page-header";
import { listBuyerVerticalOffersByBuyer } from "@/lib/contact-verticals";
import { getDirectoryOptions } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";

export default async function NewBuyerInvoicePage() {
  const ctx = await requireBrokerOps();
  const { buyers, verticals } = await getDirectoryOptions(ctx.tenantId);
  const buyerVerticalOffers = await listBuyerVerticalOffersByBuyer(
    ctx.tenantId,
    buyers.map((buyer) => buyer.id),
  );
  return (
    <div>
      <PageHeader title="New buyer invoice" description="Add a receivable to the buyers ledger." />
      <BuyerInvoiceForm buyers={buyers} verticals={verticals} buyerVerticalOffers={buyerVerticalOffers} />
    </div>
  );
}
