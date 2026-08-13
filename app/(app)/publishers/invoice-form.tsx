"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { PaymentStatus, RateType } from "@prisma/client";
import { deletePublisherInvoice, upsertPublisherInvoice } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import { NativeSelect, PaymentStatusSelect, TextInput } from "@/components/forms";
import { InvoiceLineFields } from "@/components/invoice-line-fields";
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
  payable?: unknown;
  paid?: unknown;
  paidAt?: Date | null;
  paymentMethod?: string | null;
  paymentTermsDays?: number | null;
  paymentStatus?: PaymentStatus;
};

export function PublisherInvoiceForm({
  invoice,
  publishers,
  verticals,
  lockedPublisherId,
  submitLabel,
}: {
  invoice?: Invoice;
  publishers: { id: string; name: string }[];
  verticals: { id: string; name: string }[];
  /** When set (publisher portal), the publisher field is fixed. */
  lockedPublisherId?: string;
  submitLabel?: string;
}) {
  const publisherId = lockedPublisherId ?? invoice?.publisherId;
  return (
    <MainCard title={invoice?.id ? "Edit invoice" : "New invoice"}>
      <Box
        component="form"
        action={upsertPublisherInvoice}
        sx={{ display: "grid", gap: 2, gridTemplateColumns: { md: "repeat(3, 1fr)" } }}
      >
        {invoice?.id ? <input type="hidden" name="id" value={invoice.id} /> : null}
        {lockedPublisherId ? (
          <input type="hidden" name="publisherId" value={lockedPublisherId} />
        ) : (
          <NativeSelect label="Publisher" name="publisherId" defaultValue={publisherId} required>
            <option value="">Select publisher</option>
            {publishers.map((publisher) => (
              <option key={publisher.id} value={publisher.id}>
                {publisher.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect label="Vertical" name="verticalId" defaultValue={invoice?.verticalId ?? ""}>
          <option value="">None</option>
          {verticals.map((vertical) => (
            <option key={vertical.id} value={vertical.id}>
              {vertical.name}
            </option>
          ))}
        </NativeSelect>
        <TextInput label="Invoice number" name="invoiceNumber" defaultValue={invoice?.invoiceNumber ?? ""} />
        <TextInput label="Month label" name="monthLabel" defaultValue={invoice?.monthLabel ?? ""} />
        <TextInput label="Week label" name="weekLabel" defaultValue={invoice?.weekLabel ?? ""} />
        <TextInput label="Period label" name="periodLabel" defaultValue={invoice?.periodLabel ?? ""} />
        <TextInput label="Period start" name="periodStart" type="date" defaultValue={isoDate(invoice?.periodStart)} />
        <TextInput label="Period end" name="periodEnd" type="date" defaultValue={isoDate(invoice?.periodEnd)} />
        <TextInput label="Due date" name="dueDate" type="date" defaultValue={isoDate(invoice?.dueDate)} />

        <InvoiceLineFields
          totalName="amount"
          totalLabel="Amount"
          mirrorName="payable"
          mirrorLabel="Payable"
          defaultLeadCount={invoice?.leadCount == null ? "" : String(num(invoice.leadCount))}
          defaultRate={invoice?.rate == null ? "" : String(num(invoice.rate))}
          defaultRateType={invoice?.rateType}
          defaultTotal={invoice?.amount == null ? "" : String(num(invoice.amount))}
          defaultMirror={invoice?.payable == null ? "" : String(num(invoice.payable))}
        />

        {!lockedPublisherId ? (
          <>
            <TextInput
              label="Paid"
              name="paid"
              defaultValue={invoice?.paid == null ? "" : String(num(invoice.paid))}
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
        <TextInput
          label="NET days"
          name="paymentTermsDays"
          defaultValue={invoice?.paymentTermsDays ?? ""}
          kind="int"
          min={0}
          max={365}
        />
        <Stack direction="row" spacing={1} sx={{ gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" color="secondary">
            {submitLabel ?? (invoice?.id ? "Save invoice" : "Create invoice")}
          </Button>
          {invoice?.id && !lockedPublisherId ? (
            <Button type="submit" color="error" formAction={deletePublisherInvoice}>
              Delete
            </Button>
          ) : null}
        </Stack>
      </Box>
    </MainCard>
  );
}
