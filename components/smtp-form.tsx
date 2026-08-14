"use client";

import { useActionState, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  deleteSmtpMailboxAction,
  saveSmtpMailboxAction,
  sendInvoiceEmailAction,
  setDefaultSmtpMailboxAction,
  testSmtpMailboxAction,
} from "@/app/actions/email";
import { NativeSelect, TextInput } from "@/components/forms";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-ui";
import type { SmtpMailboxPublic } from "@/lib/smtp";

function MailboxForm({
  mailbox,
  onCancel,
}: {
  mailbox?: SmtpMailboxPublic | null;
  onCancel: () => void;
}) {
  const [state, action] = useActionState(saveSmtpMailboxAction, {} as { error?: string; ok?: boolean; fieldErrors?: Record<string, string> });
  const errors = state.fieldErrors ?? {};

  return (
    <Box
      component="form"
      action={action}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
        mb: 2,
      }}
    >
      {mailbox ? <input type="hidden" name="id" value={mailbox.id} /> : null}
      <SettingsRow label="Label" hint="Short name so you can pick this mailbox when emailing invoices.">
        <TextInput label="Label" name="label" defaultValue={mailbox?.label ?? ""} required hideLabel maxLength={60} errorMessage={errors.label} />
      </SettingsRow>
      <SettingsRow label="SMTP host" hint="For example smtp.gmail.com or smtp.office365.com.">
        <TextInput label="SMTP host" name="host" defaultValue={mailbox?.host ?? ""} required hideLabel maxLength={253} errorMessage={errors.host} />
      </SettingsRow>
      <SettingsRow label="Port" hint="587 for STARTTLS, or 465 for TLS.">
        <Box sx={{ maxWidth: 160, width: "100%" }}>
          <TextInput label="Port" name="port" defaultValue={mailbox?.port ?? 587} required kind="int" min={1} max={65535} hideLabel errorMessage={errors.port} />
        </Box>
      </SettingsRow>
      <SettingsRow label="Connection">
        <NativeSelect label="Connection" name="secure" defaultValue={mailbox?.secure ? "true" : "false"} hideLabel>
          <option value="false">STARTTLS (port 587)</option>
          <option value="true">TLS (port 465)</option>
        </NativeSelect>
      </SettingsRow>
      <SettingsRow label="Username" hint="Usually the full email address.">
        <TextInput label="Username" name="username" defaultValue={mailbox?.username ?? ""} required hideLabel maxLength={254} errorMessage={errors.username} />
      </SettingsRow>
      <SettingsRow
        label="Password"
        hint={mailbox?.hasPassword ? "Leave blank to keep the saved password." : "App password recommended for Gmail."}
      >
        <TextInput
          label={mailbox?.hasPassword ? "Password (leave blank to keep)" : "Password"}
          name="password"
          type="password"
          required={!mailbox?.hasPassword}
          hideLabel
          maxLength={128}
          errorMessage={errors.password}
        />
      </SettingsRow>
      <SettingsRow label="From email" hint="The address buyers see as the sender.">
        <TextInput
          label="From email"
          name="fromEmail"
          type="email"
          defaultValue={mailbox?.fromEmail ?? ""}
          required
          hideLabel
          maxLength={254}
          errorMessage={errors.fromEmail}
        />
      </SettingsRow>
      <SettingsRow label="From name" hint="Optional display name, such as your company name.">
        <TextInput label="From name" name="fromName" defaultValue={mailbox?.fromName ?? ""} hideLabel maxLength={80} />
      </SettingsRow>
      {!mailbox?.isDefault ? (
        <SettingsRow label="Default">
          <NativeSelect label="Default" name="makeDefault" defaultValue="false" hideLabel>
            <option value="false">Keep current default</option>
            <option value="true">Make this the default mailbox</option>
          </NativeSelect>
        </SettingsRow>
      ) : (
        <input type="hidden" name="makeDefault" value="true" />
      )}
      <Box sx={{ px: 3, py: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        {state.error && !state.fieldErrors ? (
          <Typography color="error" variant="body2" sx={{ width: "100%" }}>
            {state.error}
          </Typography>
        ) : null}
        {state.ok ? (
          <Typography color="success.main" variant="body2" sx={{ width: "100%" }}>
            Mailbox saved.
          </Typography>
        ) : null}
        <Button type="submit" variant="contained" color="secondary">
          {mailbox ? "Save changes" : "Save mailbox"}
        </Button>
        <Button type="button" variant="text" onClick={onCancel}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

export function SmtpSettingsForm({ mailboxes }: { mailboxes: SmtpMailboxPublic[] }) {
  const [mode, setMode] = useState<"list" | "add" | string>("list");
  const [deleteState, deleteAction] = useActionState(deleteSmtpMailboxAction, {} as { error?: string; ok?: boolean });
  const [defaultState, defaultAction] = useActionState(
    setDefaultSmtpMailboxAction,
    {} as { error?: string; ok?: boolean },
  );
  const [testState, testAction] = useActionState(testSmtpMailboxAction, {} as { error?: string; ok?: boolean });

  const editing = mode !== "list" && mode !== "add" ? mailboxes.find((row) => row.id === mode) : null;

  return (
    <Box>
      <SettingsSection
        title="Mailboxes"
        description="Save one or more mailboxes for invoice email. When you send an invoice, pick which mailbox to use."
      >
        {mailboxes.length === 0 && mode === "list" ? (
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
              No mailbox yet. Add one to email invoices to buyers.
            </Typography>
            <Button variant="contained" color="secondary" startIcon={<IconPlus size={16} />} onClick={() => setMode("add")}>
              Add mailbox
            </Button>
          </Box>
        ) : null}

        {mailboxes.map((row) => (
          <Box
            key={row.id}
            sx={{
              px: 3,
              py: 1.75,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {row.label}
                </Typography>
                {row.isDefault ? (
                  <Chip size="small" label="Default" color="secondary" sx={{ height: 22, fontWeight: 600 }} />
                ) : null}
                <Chip
                  size="small"
                  label={row.configured ? "Ready" : "Incomplete"}
                  variant="outlined"
                  sx={{ height: 22, fontWeight: 600 }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                {row.fromEmail || row.username} · {row.host}:{row.port}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              {!row.isDefault ? (
                <Box component="form" action={defaultAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <Button type="submit" size="small" variant="text">
                    Default
                  </Button>
                </Box>
              ) : null}
              <Box component="form" action={testAction}>
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" size="small" variant="text" disabled={!row.configured}>
                  Test
                </Button>
              </Box>
              <IconButton
                size="small"
                aria-label={`Edit ${row.label}`}
                onClick={() => setMode(row.id)}
                sx={{ minWidth: 40, minHeight: 40 }}
              >
                <IconPencil size={16} />
              </IconButton>
              <Box component="form" action={deleteAction}>
                <input type="hidden" name="id" value={row.id} />
                <IconButton type="submit" size="small" aria-label={`Delete ${row.label}`} sx={{ minWidth: 40, minHeight: 40 }}>
                  <IconTrash size={16} />
                </IconButton>
              </Box>
            </Stack>
          </Box>
        ))}

        {mode === "list" && mailboxes.length > 0 ? (
          <Box sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" startIcon={<IconPlus size={16} />} onClick={() => setMode("add")}>
              Add another mailbox
            </Button>
          </Box>
        ) : null}

        {(deleteState.error || defaultState.error || testState.error) && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Typography color="error" variant="body2">
              {deleteState.error || defaultState.error || testState.error}
            </Typography>
          </Box>
        )}
        {(deleteState.ok || defaultState.ok || testState.ok) && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Typography color="success.main" variant="body2">
              {testState.ok ? "Test email sent to your login address." : "Updated."}
            </Typography>
          </Box>
        )}
      </SettingsSection>

      {mode === "add" ? <MailboxForm onCancel={() => setMode("list")} /> : null}
      {editing ? <MailboxForm mailbox={editing} onCancel={() => setMode("list")} /> : null}
    </Box>
  );
}

export function SendInvoiceButton({
  invoiceId,
  toEmail,
  compact,
  mailboxes = [],
}: {
  invoiceId: string;
  toEmail?: string | null;
  compact?: boolean;
  mailboxes?: SmtpMailboxPublic[];
}) {
  const [state, action] = useActionState(sendInvoiceEmailAction, {} as { error?: string; ok?: boolean });
  const ready = mailboxes.filter((row) => row.configured);
  const defaultId = ready.find((row) => row.isDefault)?.id ?? ready[0]?.id ?? "";

  return (
    <Box
      component="form"
      action={action}
      sx={{ display: compact ? "inline-flex" : "grid", gap: 1, alignItems: "center" }}
    >
      <input type="hidden" name="id" value={invoiceId} />
      {toEmail ? <input type="hidden" name="toEmail" value={toEmail} /> : null}
      <Stack direction={compact ? "row" : "column"} spacing={1} sx={{ alignItems: compact ? "center" : "stretch" }}>
        {ready.length > 1 ? (
          <Box sx={{ minWidth: compact ? 180 : "100%" }}>
            <NativeSelect label="Send from" name="mailboxId" defaultValue={defaultId} hideLabel={compact}>
              {ready.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label} ({row.fromEmail})
                </option>
              ))}
            </NativeSelect>
          </Box>
        ) : ready.length === 1 ? (
          <input type="hidden" name="mailboxId" value={ready[0].id} />
        ) : null}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            type="submit"
            size={compact ? "small" : "medium"}
            variant={compact ? "text" : "contained"}
            color="secondary"
            disabled={ready.length === 0}
          >
            Email buyer
          </Button>
          {state.ok ? (
            <Typography variant="caption" color="success.main">
              Sent
            </Typography>
          ) : null}
          {state.error ? (
            <Typography variant="caption" color="error">
              {state.error}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
