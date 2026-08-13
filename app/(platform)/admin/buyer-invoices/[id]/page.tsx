import Link from "next/link";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { InvoiceStatus, PaymentStatus } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { platformDeleteBuyerInvoice, platformUpdateBuyerInvoice } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

export default async function PlatformBuyerInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const row = await prisma.buyerInvoice.findUnique({
    where: { id },
    include: { buyer: true, tenant: true },
  });
  if (!row) notFound();

  return (
    <>
      <PageHeader
        title={row.invoiceNumber || "Buyer invoice"}
        description={`${row.tenant.name} · ${row.buyer.name}`}
      />
      <Stack
        component="form"
        action={async (fd) => {
          "use server";
          await platformUpdateBuyerInvoice(fd);
        }}
        spacing={2}
        sx={{ maxWidth: 560, p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", mb: 3 }}
      >
        <input type="hidden" name="id" value={row.id} />
        <TextField name="invoiceNumber" label="Invoice number" defaultValue={row.invoiceNumber ?? ""} fullWidth />
        <TextField name="periodLabel" label="Period" defaultValue={row.periodLabel ?? ""} fullWidth />
        <TextField name="revenue" label="Revenue" defaultValue={String(num(row.revenue))} fullWidth />
        <TextField name="receivable" label="Receivable" defaultValue={String(num(row.receivable))} fullWidth />
        <TextField name="received" label="Received" defaultValue={row.received == null ? "" : String(num(row.received))} fullWidth />
        <TextField name="paymentStatus" label="Payment status" select defaultValue={row.paymentStatus} fullWidth>
          {Object.values(PaymentStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField name="invoiceStatus" label="Invoice status" select defaultValue={row.invoiceStatus} fullWidth>
          {Object.values(InvoiceStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField name="paymentMethod" label="Payment method" defaultValue={row.paymentMethod ?? ""} fullWidth />
        <TextField name="comments" label="Comments" defaultValue={row.comments ?? ""} fullWidth multiline minRows={2} />
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained">
            Save
          </Button>
          <Button component={Link} href="/admin/buyer-invoices" variant="outlined" color="secondary">
            Back
          </Button>
        </Stack>
      </Stack>
      <form
        action={async (fd) => {
          "use server";
          await platformDeleteBuyerInvoice(fd);
          redirect("/admin/buyer-invoices");
        }}
      >
        <input type="hidden" name="id" value={row.id} />
        <Button type="submit" color="error" variant="outlined">
          Delete invoice
        </Button>
      </form>
    </>
  );
}
