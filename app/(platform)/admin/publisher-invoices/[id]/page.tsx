import Link from "next/link";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { PaymentStatus } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { platformDeletePublisherInvoice, platformUpdatePublisherInvoice } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

export default async function PlatformPublisherInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const row = await prisma.publisherInvoice.findUnique({
    where: { id },
    include: { publisher: true, tenant: true },
  });
  if (!row) notFound();

  return (
    <>
      <PageHeader
        title={row.invoiceNumber || "Publisher invoice"}
        description={`${row.tenant.name} · ${row.publisher.name}`}
      />
      <Stack
        component="form"
        action={async (fd) => {
          "use server";
          await platformUpdatePublisherInvoice(fd);
        }}
        spacing={2}
        sx={{ maxWidth: 560, p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", mb: 3 }}
      >
        <input type="hidden" name="id" value={row.id} />
        <TextField name="invoiceNumber" label="Invoice number" defaultValue={row.invoiceNumber ?? ""} fullWidth />
        <TextField name="periodLabel" label="Period" defaultValue={row.periodLabel ?? ""} fullWidth />
        <TextField name="amount" label="Amount" defaultValue={String(num(row.amount))} fullWidth />
        <TextField name="payable" label="Payable" defaultValue={String(num(row.payable))} fullWidth />
        <TextField name="paid" label="Paid" defaultValue={row.paid == null ? "" : String(num(row.paid))} fullWidth />
        <TextField name="paymentStatus" label="Payment status" select defaultValue={row.paymentStatus} fullWidth>
          {Object.values(PaymentStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField name="paymentMethod" label="Payment method" defaultValue={row.paymentMethod ?? ""} fullWidth />
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained">
            Save
          </Button>
          <Button component={Link} href="/admin/publisher-invoices" variant="outlined" color="secondary">
            Back
          </Button>
        </Stack>
      </Stack>
      <form
        action={async (fd) => {
          "use server";
          await platformDeletePublisherInvoice(fd);
          redirect("/admin/publisher-invoices");
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
