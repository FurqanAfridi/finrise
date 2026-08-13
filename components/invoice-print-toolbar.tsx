"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { markBuyerInvoiceSent } from "@/app/actions/invoices";
import { SendInvoiceButton } from "@/components/smtp-form";
import type { SmtpMailboxPublic } from "@/lib/smtp";

export function InvoicePrintToolbar({
  invoiceId,
  sent,
  mailboxes = [],
}: {
  invoiceId: string;
  sent: boolean;
  mailboxes?: SmtpMailboxPublic[];
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ mb: 2, justifyContent: "center", flexWrap: "wrap", "@media print": { display: "none" } }}
    >
      <Link href={`/buyers/${invoiceId}`}>
        <Button variant="outlined">Back to edit</Button>
      </Link>
      <Link href="/buyers">
        <Button variant="outlined">Buyer ledger</Button>
      </Link>
      {!sent ? (
        <Box component="form" action={markBuyerInvoiceSent}>
          <input type="hidden" name="id" value={invoiceId} />
          <Button type="submit" variant="outlined" color="secondary">
            Mark sent
          </Button>
        </Box>
      ) : null}
      <SendInvoiceButton invoiceId={invoiceId} mailboxes={mailboxes} />
      <Button component={Link} href={`/invoices/${invoiceId}/pdf`} variant="outlined" color="secondary">
        Download PDF
      </Button>
      <Button variant="contained" color="secondary" onClick={() => window.print()}>
        Print
      </Button>
    </Stack>
  );
}
