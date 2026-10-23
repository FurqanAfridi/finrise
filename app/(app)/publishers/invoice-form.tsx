"use client";

import { useActionState, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PaymentStatus, RateType } from "@prisma/client";
import { deletePublisherInvoice, upsertPublisherInvoice } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import { NativeSelect, NetDaysSelect, PaymentStatusSelect, TextInput } from "@/components/forms";
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
  publisherId?: string;
  verticalId?: string | null;
  monthLabel?: string | null;
  weekLabel?: string | null;
  periodLabel?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  dueDate?: Date | null;
  leadCount?: unknown;
  rateType?: RateType;
  rate?: unknown;
  amount?: unknown;
  invoiceNumber?: string | null;
  terms?: string | null;
  invoiceDate?: Date | null;
  transactionAmount?: unknown;
  payable?: unknown;
  paid?: unknown;
  paidAt?: Date | null;
  paymentMethod?: string | null;
  paymentTermsDays?: number | null;
  paymentStatus?: PaymentStatus;
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

/** Saved lines, or one line built from an older single-vertical payable. */
function initialLines(invoice: Invoice | undefined, lines: SavedLine[]): InvoiceLineDraft[] {
  if (lines.length > 0) return lines.map(toDraft);
  if (!invoice?.id) return [createInvoiceLineDraft()];
  return [
    toDraft({
      verticalId: invoice.verticalId ?? null,
      leadCount: invoice.leadCount == null ? null : num(invoice.leadCount),
      rateType: invoice.rateType ?? RateType.CPL,
      rate: invoice.rate == null ? null : num(invoice.rate),
      amount: num(invoice.amount),
      comments: null,
    }),
  ];
}

export function PublisherInvoiceForm({
  invoice,
  lines: savedLines = [],
  publishers,
  verticals,
  publisherVerticalOffers,
  lockedPublisherId,
  submitLabel,
}: {
  invoice?: Invoice;
  lines?: SavedLine[];
  publishers: { id: string; name: string }[];
  verticals: { id: string; name: string }[];
  publisherVerticalOffers: Record<string, ContactVerticalOffer[]>;
  /** When set (publisher portal), the publisher field is fixed. */
  lockedPublisherId?: string;
  submitLabel?: string;
}) {
  const [publisherId, setPublisherId] = useState(lockedPublisherId ?? invoice?.publisherId ?? "");
  const [lines, setLines] = useState<InvoiceLineDraft[]>(() => initialLines(invoice, savedLines));
  const payableDiffers =
    invoice?.payable != null && invoice.amount != null && num(invoice.payable) !== num(invoice.amount);
  const [saveState, saveAction] = useActionState(upsertPublisherInvoice, {} as { error?: string });
  const [deleteState, deleteAction] = useActionState(deletePublisherInvoice, {} as { error?: string });
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
        {lockedPublisherId ? (
          <input type="hidden" name="publisherId" value={lockedPublisherId} />
        ) : (
          <NativeSelect
            label="Publisher"
            name="publisherId"
            value={publisherId}
            onChange={(event) => setPublisherId(event.target.value)}
            required
          >
            <option value="">Select publisher</option>
            {publishers.map((publisher) => (
              <option key={publisher.id} value={publisher.id}>
                {publisher.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <TextInput label="Invoice number" name="invoiceNumber" defaultValue={invoice?.invoiceNumber ?? ""} />
        <TextInput label="Month label" name="monthLabel" defaultValue={invoice?.monthLabel ?? ""} />
        <TextInput label="Week label" name="weekLabel" defaultValue={invoice?.weekLabel ?? ""} />
        <TextInput label="Date range" name="periodLabel" defaultValue={invoice?.periodLabel ?? ""} />
        <TextInput label="Date" name="invoiceDate" type="date" defaultValue={isoDate(invoice?.invoiceDate ?? invoice?.periodStart)} />
        <TextInput label="Due date" name="dueDate" type="date" defaultValue={isoDate(invoice?.dueDate)} />
        <TextInput label="Period start" name="periodStart" type="date" defaultValue={isoDate(invoice?.periodStart)} />
        <TextInput label="Period end" name="periodEnd" type="date" defaultValue={isoDate(invoice?.periodEnd)} />

        <Box sx={{ gridColumn: "1 / -1" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Verticals
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Add one line per vertical for this publisher and date range.
          </Typography>
          <InvoiceLineRowsEditor
            lines={lines}
            setLines={setLines}
            verticals={verticals}
            verticalOffers={publisherVerticalOffers}
            contactId={publisherId}
          />
        </Box>
        <TextInput
          label="Payable"
          name="payable"
          defaultValue={payableDiffers ? String(num(invoice?.payable)) : ""}
          kind="decimal"
          maxDecimals={2}
          min={0}
          helperText="Leave empty to match the invoice total. Fill in only for an adjusted amount."
        />

        {!lockedPublisherId ? (
          <>
            <TextInput
              label="Amount paid"
              name="paid"
              defaultValue={invoice?.paid == null ? "" : String(num(invoice.paid))}
              kind="decimal"
              maxDecimals={2}
              min={0}
            />
            <TextInput
              label="Transaction amount"
              name="transactionAmount"
              defaultValue={invoice?.transactionAmount == null ? "" : String(num(invoice.transactionAmount))}
              kind="decimal"
              maxDecimals={2}
              min={0}
            />
            <PaymentStatusSelect name="paymentStatus" defaultValue={invoice?.paymentStatus} />
            <TextInput label="Paid at" name="paidAt" type="date" defaultValue={isoDate(invoice?.paidAt)} />
            <TextInput label="Payment method" name="paymentMethod" defaultValue={invoice?.paymentMethod ?? ""} maxLength={80} />
          </>
        ) : (
          <input type="hidden" name="paymentStatus" value={PaymentStatus.UNPAID} />
        )}
        <TextInput label="Terms" name="terms" defaultValue={invoice?.terms ?? ""} maxLength={80} />
        <NetDaysSelect
          name="paymentTermsDays"
          defaultValue={invoice?.paymentTermsDays ?? ""}
        />
        {error ? (
          <Typography color="error" variant="body2" sx={{ gridColumn: "1 / -1" }}>
            {error}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1} sx={{ gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" color="secondary">
            {submitLabel ?? (invoice?.id ? "Save invoice" : "Create invoice")}
          </Button>
          {invoice?.id && !lockedPublisherId ? (
            <Button type="submit" color="error" formAction={deleteAction}>
              Delete
            </Button>
          ) : null}
        </Stack>
      </Box>
    </MainCard>
  );
}
