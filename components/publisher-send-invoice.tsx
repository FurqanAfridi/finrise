"use client";

import { useActionState } from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { sendPublisherInvoiceToCompanyAction } from "@/app/actions/email";

export function SendPublisherInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(sendPublisherInvoiceToCompanyAction, {});

  return (
    <form action={action}>
      <input type="hidden" name="id" value={invoiceId} />
      <Button type="submit" variant="contained" color="primary" disabled={pending}>
        {pending ? "Sending…" : "Send to company"}
      </Button>
      {state.error ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          {state.error}
        </Typography>
      ) : null}
      {state.ok ? (
        <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.5 }}>
          Sent to company admins and accountants from the platform mailbox.
        </Typography>
      ) : null}
    </form>
  );
}
