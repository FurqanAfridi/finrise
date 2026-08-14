"use client";

import { useActionState, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { inviteContact, removeContact, setContactActive, upsertDirectory } from "@/app/actions/ops";
import { NativeSelect, NetDaysSelect, TextInput } from "@/components/forms";

type ContactKind = "buyer" | "publisher" | "vertical";

export function DirectoryAddForm() {
  const [kind, setKind] = useState<ContactKind>("buyer");
  const [state, action] = useActionState(upsertDirectory, {} as { error?: string; ok?: boolean });

  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 2, gridTemplateColumns: { md: "1fr 1fr" } }}>
      <Box sx={{ gridColumn: "1 / -1" }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
          {kind === "vertical"
            ? "Verticals group invoices for reporting."
            : "Enter full contact details. After saving, invite them so they only see their own invoices."}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {([
            { value: "buyer", label: "Buyer" },
            { value: "publisher", label: "Publisher" },
            { value: "vertical", label: "Vertical" },
          ] as const).map((row) => (
            <Button
              key={row.value}
              type="button"
              size="small"
              variant={kind === row.value ? "contained" : "outlined"}
              color="secondary"
              onClick={() => setKind(row.value)}
            >
              {row.label}
            </Button>
          ))}
        </Stack>
        <input type="hidden" name="kind" value={kind} />
      </Box>

      <TextInput label="Company / name" name="name" required maxLength={120} />

      {kind !== "vertical" ? (
        <>
          <TextInput label="Contact name" name="contactName" required kind="letters" maxLength={80} />
          <TextInput label="Email" name="email" type="email" required maxLength={254} />
          <NetDaysSelect
            name="defaultPaymentTermsDays"
            label="Default NET days"
            defaultValue={7}
            required
          />
          <Box sx={{ gridColumn: "1 / -1" }}>
            <TextInput label="Address" name="address" required maxLength={200} />
          </Box>
          <TextInput label="Default payment terms" name="defaultTerms" maxLength={80} />
          {kind === "buyer" ? (
            <TextInput label="Default payment method" name="defaultMethod" maxLength={80} />
          ) : (
            <NativeSelect label="Internal publisher" name="isInternal" defaultValue="false">
              <option value="false">External</option>
              <option value="true">Internal</option>
            </NativeSelect>
          )}
        </>
      ) : null}

      {state.error ? (
        <Typography color="error" variant="body2" sx={{ gridColumn: "1 / -1" }}>
          {state.error}
        </Typography>
      ) : null}
      {state.ok ? (
        <Typography color="success.main" variant="body2" sx={{ gridColumn: "1 / -1" }}>
          Contact saved. You can invite them from the list below.
        </Typography>
      ) : null}
      <Box sx={{ gridColumn: "1 / -1" }}>
        <Button type="submit" variant="contained" color="secondary">
          {kind === "vertical" ? "Add vertical" : kind === "buyer" ? "Add buyer" : "Add publisher"}
        </Button>
      </Box>
    </Box>
  );
}

export function ContactInviteButton({
  kind,
  contactId,
  email,
  resend,
}: {
  kind: "buyer" | "publisher";
  contactId: string;
  email?: string | null;
  resend?: boolean;
}) {
  const [state, action] = useActionState(inviteContact, {} as {
    error?: string;
    ok?: boolean;
    emailed?: boolean;
    inviteUrl?: string;
  });

  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 0.75, minWidth: 200 }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="contactId" value={contactId} />
      <TextInput
        label="Invite email"
        name="email"
        type="email"
        defaultValue={email ?? ""}
        required
        hideLabel
        maxLength={254}
      />
      <Button type="submit" size="small" variant="outlined" color="secondary">
        {resend ? "Resend invite" : "Send invite"}
      </Button>
      {state.ok && state.emailed ? (
        <Typography variant="caption" color="success.main">
          Invitation emailed
        </Typography>
      ) : null}
      {state.error ? (
        <Typography variant="caption" color={state.ok ? "warning.main" : "error"} sx={{ lineHeight: 1.4 }}>
          {state.error}
        </Typography>
      ) : null}
      {state.inviteUrl && !state.emailed ? (
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
          {state.inviteUrl}
        </Typography>
      ) : null}
    </Box>
  );
}

export function ContactLifecycleActions({
  kind,
  contactId,
  isActive,
  hasInvoices,
}: {
  kind: "buyer" | "publisher";
  contactId: string;
  isActive: boolean;
  hasInvoices: boolean;
}) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      <Box component="form" action={setContactActive}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="contactId" value={contactId} />
        <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
        <Button type="submit" size="small" variant="outlined">
          {isActive ? "Deactivate" : "Reactivate"}
        </Button>
      </Box>
      {!hasInvoices ? (
        <Box component="form" action={removeContact}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="contactId" value={contactId} />
          <Button type="submit" size="small" color="error" variant="text">
            Remove
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}
