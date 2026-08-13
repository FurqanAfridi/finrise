"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { InvoiceStatus, PaymentStatus, RateType } from "@prisma/client";
import { deleteBuyerInvoice, upsertBuyerInvoice } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import {
  InvoiceStatusSelect,
  NativeSelect,
  PaymentStatusSelect,
  RateTypeSelect,
  TextInput,
} from "@/components/forms";
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
  terms?: string | null;
  paymentTermsDays?: number | null;
  paymentStatus?: PaymentStatus;
  invoiceStatus?: InvoiceStatus;
  receivable?: unknown;
  received?: unknown;
  paidAt?: Date | null;
  paymentMethod?: string | null;
  comments?: string | null;
};

export function BuyerInvoiceForm({
  invoice,
  buyers,
  verticals,
}: {
  invoice?: Invoice;
  buyers: { id: string; name: string }[];
  verticals: { id: string; name: string }[];
}) {
  return (
    <MainCard title={invoice?.id ? "Edit invoice" : "New invoice"}>
      <Box
        component="form"
        action={upsertBuyerInvoice}
        sx={{ display: "grid", gap: 2, gridTemplateColumns: { md: "repeat(3, 1fr)" } }}
      >
        {invoice?.id ? <input type="hidden" name="id" value={invoice.id} /> : null}
        <NativeSelect label="Buyer" name="buyerId" defaultValue={invoice?.buyerId} required>
          <option value="">Select buyer</option>
          {buyers.map((buyer) => (
            <option key={buyer.id} value={buyer.id}>
              {buyer.name}
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
          label="Revenue"
          name="revenue"
          required
          defaultValue={invoice?.revenue == null ? "" : String(num(invoice.revenue))}
          kind="decimal"
          maxDecimals={2}
          min={0}
        />
        <TextInput
          label="Receivable"
          name="receivable"
          defaultValue={invoice?.receivable == null ? "" : String(num(invoice.receivable))}
          kind="decimal"
          maxDecimals={2}
          min={0}
        />
        <TextInput
          label="Received"
          name="received"
          defaultValue={invoice?.received == null ? "" : String(num(invoice.received))}
          kind="decimal"
          maxDecimals={2}
          min={0}
        />
        <TextInput
          label="NET days"
          name="paymentTermsDays"
          defaultValue={invoice?.paymentTermsDays ?? 7}
          required
          kind="int"
          min={0}
          max={365}
        />
        <PaymentStatusSelect name="paymentStatus" defaultValue={invoice?.paymentStatus} />
        <InvoiceStatusSelect name="invoiceStatus" defaultValue={invoice?.invoiceStatus} />
        <TextInput label="Paid at" name="paidAt" type="date" defaultValue={isoDate(invoice?.paidAt)} />
        <TextInput label="Payment method" name="paymentMethod" defaultValue={invoice?.paymentMethod ?? ""} maxLength={80} />
        <TextInput label="Comments" name="comments" defaultValue={invoice?.comments ?? ""} maxLength={500} />
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
            <Button type="submit" color="error" formAction={deleteBuyerInvoice}>
              Delete
            </Button>
          ) : null}
        </Stack>
      </Box>
    </MainCard>
  );
}
