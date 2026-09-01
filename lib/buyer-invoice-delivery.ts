import type { RateType } from "@prisma/client";
import {
  invoiceVerticalLabel,
  loadBuyerInvoiceLines,
  resolveInvoiceLineDisplay,
  type InvoiceLineDisplay,
} from "@/lib/invoice-lines";
import { buyerEmailsForDisplay, listBuyerEmails } from "@/lib/buyer-emails";

type BuyerInvoiceRecord = {
  id: string;
  buyerId: string;
  invoiceNumber: string | null;
  periodLabel: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  leadCount: unknown;
  rateType: RateType;
  rate: unknown;
  revenue: unknown;
  receivable: unknown;
  terms: string | null;
  paymentTermsDays: number | null;
  comments: string | null;
  buyer: {
    name: string;
    email: string | null;
    address: string | null;
    contactName: string | null;
  };
  vertical?: { name: string } | null;
};

export async function buildBuyerInvoiceDeliveryContext(
  tenantId: string,
  invoice: BuyerInvoiceRecord,
  billing?: { email: string | null; address: string | null; contactName: string | null } | null,
) {
  const [storedLines, storedEmails] = await Promise.all([
    loadBuyerInvoiceLines(tenantId, invoice.id),
    listBuyerEmails(tenantId, invoice.buyerId),
  ]);

  const lines = resolveInvoiceLineDisplay({
    lines: storedLines,
    fallback: {
      verticalName: invoice.vertical?.name ?? null,
      leadCount: invoice.leadCount,
      rateType: invoice.rateType,
      rate: invoice.rate,
      amount: invoice.revenue,
      comments: invoice.comments,
    },
  });

  const buyerEmails = buyerEmailsForDisplay(
    storedEmails.map((row) => row.email),
    billing?.email ?? invoice.buyer.email,
  );

  return {
    lines,
    buyerEmails,
    verticalName: invoiceVerticalLabel(lines),
    buyerAddress: billing?.address ?? invoice.buyer.address,
    buyerContact: billing?.contactName ?? invoice.buyer.contactName,
  };
}

export type BuyerInvoiceDeliveryPayload = {
  invoiceNumber: string | null;
  periodLabel: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  revenue: unknown;
  receivable: unknown;
  terms: string | null;
  paymentTermsDays: number | null;
  comments: string | null;
  buyerName: string;
  buyerEmails: string[];
  buyerAddress: string | null;
  buyerContact: string | null;
  verticalName: string | null;
  lines: InvoiceLineDisplay[];
};

export function toBuyerInvoiceDeliveryPayload(
  invoice: BuyerInvoiceRecord,
  context: Awaited<ReturnType<typeof buildBuyerInvoiceDeliveryContext>>,
): BuyerInvoiceDeliveryPayload {
  return {
    invoiceNumber: invoice.invoiceNumber,
    periodLabel: invoice.periodLabel,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt,
    revenue: invoice.revenue,
    receivable: invoice.receivable,
    terms: invoice.terms,
    paymentTermsDays: invoice.paymentTermsDays,
    comments: invoice.comments,
    buyerName: invoice.buyer.name,
    buyerEmails: context.buyerEmails,
    buyerAddress: context.buyerAddress,
    buyerContact: context.buyerContact,
    verticalName: context.verticalName,
    lines: context.lines,
  };
}
