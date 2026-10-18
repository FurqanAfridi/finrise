"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { InvoiceStatus, PaymentStatus, RateType } from "@prisma/client";
import { deleteBuyerInvoice, upsertBuyerInvoice } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import { InvoiceStatusSelect, NativeSelect, NetDaysSelect, PaymentStatusSelect, TextInput } from "@/components/forms";
import {
  createInvoiceLineDraft,
  InvoiceLineRowsEditor,
  InvoiceWizardHiddenFields,
  type InvoiceLineDraft,
} from "@/components/invoice-line-rows-editor";
import type { ContactVerticalOffer } from "@/lib/contact-verticals";
import { isoDate } from "@/lib/dates";
import { num } from "@/lib/utils";

type Invoice = {
  id?: string;
  buyerId?: string;
  verticalId?: string | null;
  periodLabel?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  dueDate?: Date | null;
  leadCount?: unknown;
  rateType?: RateType;
  rate?: unknown;
  revenue?: unknown;
  invoiceNumber?: string | null;
  invoiceDate?: Date | null;
  terms?: string | null;
  bankCredit?: unknown;
  paymentTermsDays?: number | null;
  paymentStatus?: PaymentStatus;
  invoiceStatus?: InvoiceStatus;
  receivable?: unknown;
  received?: unknown;
  paidAt?: Date | null;
  paymentMethod?: string | null;
  comments?: string | null;
};

type SavedLine = {
  verticalId: string | null;
  leadCount: number | null;
  rateType: RateType;
  rate: number | null;
  amount: number;
  comments: string | null;
};

function toDraft(line: SavedLine): InvoiceLineDraft {
  const computed = line.leadCount != null && line.rate != null ? Math.round(line.leadCount * line.rate * 100) / 100 : null;
  return {
    ...createInvoiceLineDraft(line.verticalId ?? ""),
    leadCount: line.leadCount == null ? "" : String(line.leadCount),
    rateType: line.rateType,
    rate: line.rate == null ? "" : String(line.rate),
    amount: line.amount.toFixed(2),
    // Keep a typed-in amount that does not match quantity × rate.
    amountUnlocked: computed == null || computed !== line.amount,
    comments: line.comments ?? "",
  };
}

/** Saved lines, or one line built from an older single-vertical invoice. */
function initialLines(invoice: Invoice | undefined, lines: SavedLine[]): InvoiceLineDraft[] {
  if (lines.length > 0) return lines.map(toDraft);
  if (!invoice?.id) return [createInvoiceLineDraft()];
  return [
    toDraft({
      verticalId: invoice.verticalId ?? null,
      leadCount: invoice.leadCount == null ? null : num(invoice.leadCount),
      rateType: invoice.rateType ?? RateType.CPL,
      rate: invoice.rate == null ? null : num(invoice.rate),
      amount: num(invoice.revenue),
      comments: invoice.comments ?? null,
    }),
  ];
}

export function BuyerInvoiceForm({
  invoice,
  lines: savedLines = [],
  buyers,
  verticals,
  buyerVerticalOffers,
}: {
  invoice?: Invoice;
  lines?: SavedLine[];
  buyers: { id: string; name: string }[];
  verticals: { id: string; name: string }[];
  buyerVerticalOffers: Record<string, ContactVerticalOffer[]>;
}) {
  const [buyerId, setBuyerId] = useState(invoice?.buyerId ?? "");
  const [lines, setLines] = useState<InvoiceLineDraft[]>(() => initialLines(invoice, savedLines));
  const receivableDiffers =
    invoice?.receivable != null && invoice.revenue != null && num(invoice.receivable) !== num(invoice.revenue);
  const [saveState, saveAction] = useActionState(upsertBuyerInvoice, {} as { error?: string });
  const [deleteState, deleteAction] = useActionState(deleteBuyerInvoice, {} as { error?: string });
  const error = saveState.error || deleteState.error;
  return (
    <MainCard title={invoice?.id ? "Edit invoice" : "New invoice"}>
      <Box
        component="form"
        action={saveAction}
        sx={{ display: "grid", gap: 2, gridTemplateColumns: { md: "repeat(3, 1fr)" } }}
      >
        {invoice?.id ? <input type="hidden" name="id" value={invoice.id} /> : null}
        <InvoiceWizardHiddenFields emails={[]} lines={lines} />
        <NativeSelect
          label="Buyer"
          name="buyerId"
          value={buyerId}
          onChange={(event) => setBuyerId(event.target.value)}
          required
        >
          <option value="">Select buyer</option>
          {buyers.map((buyer) => (
            <option key={buyer.id} value={buyer.id}>
              {buyer.name}
            </option>
          ))}
        </NativeSelect>
        <TextInput label="Invoice number" name="invoiceNumber" defaultValue={invoice?.invoiceNumber ?? ""} />
        <TextInput label="Date range" name="periodLabel" defaultValue={invoice?.periodLabel ?? ""} helperText="Matches your sheet date range column" />
        <TextInput label="Date" name="invoiceDate" type="date" defaultValue={isoDate(invoice?.invoiceDate ?? invoice?.periodStart)} />
        <TextInput label="Due date" name="dueDate" type="date" defaultValue={isoDate(invoice?.dueDate)} />
        <TextInput label="Period start" name="periodStart" type="date" defaultValue={isoDate(invoice?.periodStart)} />
        <TextInput label="Period end" name="periodEnd" type="date" defaultValue={isoDate(invoice?.periodEnd)} />

        <Box sx={{ gridColumn: "1 / -1" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Verticals billed
          </Typography>
          <InvoiceLineRowsEditor
            lines={lines}
            setLines={setLines}
            verticals={verticals}
            buyerVerticalOffers={buyerVerticalOffers}
            buyerId={buyerId}
          />
        </Box>
        <TextInput
          label="Receivable"
          name="receivable"
          defaultValue={receivableDiffers ? String(num(invoice?.receivable)) : ""}
          kind="decimal"
          maxDecimals={2}
          min={0}
          helperText="Leave empty to match the invoice total. Fill in only for an adjusted amount."
        />

        <NetDaysSelect
          name="paymentTermsDays"
          defaultValue={invoice?.paymentTermsDays ?? 7}
          required
        />
        <TextInput label="Payment terms" name="terms" defaultValue={invoice?.terms ?? ""} maxLength={80} />
        <PaymentStatusSelect name="paymentStatus" defaultValue={invoice?.paymentStatus} />
        <InvoiceStatusSelect name="invoiceStatus" defaultValue={invoice?.invoiceStatus} />
        <TextInput
          label="Payment received"
          name="received"
          defaultValue={invoice?.received == null ? "" : String(num(invoice.received))}
          kind="decimal"
          maxDecimals={2}
          min={0}
        />
        <TextInput
          label="Bank credit"
          name="bankCredit"
          defaultValue={invoice?.bankCredit == null ? "" : String(num(invoice.bankCredit))}
          kind="decimal"
          maxDecimals={2}
          min={0}
        />
        <TextInput label="Paid at" name="paidAt" type="date" defaultValue={isoDate(invoice?.paidAt)} />
        <TextInput label="Payment method" name="paymentMethod" defaultValue={invoice?.paymentMethod ?? ""} maxLength={80} />
        <TextInput label="Comments" name="comments" defaultValue={invoice?.comments ?? ""} maxLength={500} />
        {error ? (
          <Typography color="error" variant="body2" sx={{ gridColumn: "1 / -1" }}>
            {error}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1} sx={{ gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" color="secondary">
            Save invoice
          </Button>
          {invoice?.id ? (
            <Link href={`/invoices/${invoice.id}`}>
              <Button variant="outlined" color="secondary">
                View / print invoice
              </Button>
            </Link>
          ) : null}
          {invoice?.id ? (
            <Button type="submit" color="error" formAction={deleteAction}>
              Delete
            </Button>
          ) : null}
        </Stack>
      </Box>
    </MainCard>
  );
}
