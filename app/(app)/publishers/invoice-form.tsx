"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { PaymentStatus, RateType } from "@prisma/client";
import { deletePublisherInvoice, upsertPublisherInvoice } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import { NativeSelect, PaymentStatusSelect, RateTypeSelect, TextInput } from "@/components/forms";
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
}: {
  invoice?: Invoice;
  publishers: { id: string; name: string }[];
  verticals: { id: string; name: string }[];
}) {
  return (
    <MainCard title={invoice?.id ? "Edit payable" : "New payable"}>
      <Box
        component="form"
        action={upsertPublisherInvoice}
        sx={{ display: "grid", gap: 2, gridTemplateColumns: { md: "repeat(3, 1fr)" } }}
      >
        {invoice?.id ? <input type="hidden" name="id" value={invoice.id} /> : null}
        <NativeSelect label="Publisher" name="publisherId" defaultValue={invoice?.publisherId} required>
          <option value="">Select publisher</option>
          {publishers.map((publisher) => (
            <option key={publisher.id} value={publisher.id}>
              {publisher.name}
            </option>
          ))}
        </NativeSelect>
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
        <TextInput
          label="Lead / call count"
          name="leadCount"
          defaultValue={invoice?.leadCount == null ? "" : String(num(invoice.leadCount))}
          kind="int"
          min={0}
        />
        <RateTypeSelect name="rateType" defaultValue={invoice?.rateType} />
        <TextInput
          label="Rate"
          name="rate"
          defaultValue={invoice?.rate == null ? "" : String(num(invoice.rate))}
          kind="decimal"
          maxDecimals={4}
          min={0}
        />
        <TextInput
          label="Amount"
          name="amount"
          required
          defaultValue={invoice?.amount == null ? "" : String(num(invoice.amount))}
          kind="decimal"
          maxDecimals={2}
          min={0}
        />
        <TextInput
          label="Payable"
          name="payable"
          defaultValue={invoice?.payable == null ? "" : String(num(invoice.payable))}
          kind="decimal"
          maxDecimals={2}
          min={0}
        />
        <TextInput
          label="Paid"
          name="paid"
          defaultValue={invoice?.paid == null ? "" : String(num(invoice.paid))}
          kind="decimal"
          maxDecimals={2}
          min={0}
        />
        <TextInput label="Terms" name="terms" defaultValue={invoice?.terms ?? ""} maxLength={80} />
        <TextInput
          label="NET days"
          name="paymentTermsDays"
          defaultValue={invoice?.paymentTermsDays ?? ""}
          kind="int"
          min={0}
          max={365}
        />
        <TextInput label="Paid at" name="paidAt" type="date" defaultValue={isoDate(invoice?.paidAt)} />
        <TextInput label="Payment method" name="paymentMethod" defaultValue={invoice?.paymentMethod ?? ""} maxLength={80} />
        <PaymentStatusSelect name="paymentStatus" defaultValue={invoice?.paymentStatus} />
        <Stack direction="row" spacing={1} sx={{ gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" color="secondary">
            Save payable
          </Button>
          {invoice?.id ? (
            <Button type="submit" color="error" formAction={deletePublisherInvoice}>
              Delete
            </Button>
          ) : null}
        </Stack>
      </Box>
    </MainCard>
  );
}
