"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { createInvite } from "@/app/actions/ops";
import { NativeSelect, TextInput } from "@/components/forms";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-ui";
import { TENANT_ROLE_LABEL } from "@/lib/status";

export function InviteForm() {
  const [state, action] = useActionState(createInvite, {} as {
    error?: string;
    ok?: boolean;
    emailed?: boolean;
    inviteUrl?: string;
  });

  return (
    <Box component="form" action={action}>
      <SettingsSection
        title="Invite someone"
        description="We email an invitation from info@ridgerisemedia.com. Existing users join this company; new users create an account from the link."
      >
        <SettingsRow label="Email" hint="They will sign in with this address.">
          <TextInput label="Email" name="email" type="email" required hideLabel />
        </SettingsRow>
        <SettingsRow
          label="Role"
          hint="Admin can change settings. Broker and Accountant can enter invoices. Invite buyers and publishers from Contacts."
        >
          <NativeSelect label="Company role" name="tenantRole" defaultValue="BROKER" hideLabel>
            <option value="BROKER">{TENANT_ROLE_LABEL.BROKER}</option>
            <option value="ACCOUNTANT">{TENANT_ROLE_LABEL.ACCOUNTANT}</option>
            <option value="ADMIN">{TENANT_ROLE_LABEL.ADMIN}</option>
          </NativeSelect>
        </SettingsRow>
        <Box sx={{ px: 3, py: 2.5 }}>
          {state.ok && state.emailed ? (
            <Typography color="success.main" variant="body2" sx={{ mb: 1 }}>
              Invitation emailed.
            </Typography>
          ) : null}
          {state.error ? (
            <Typography color={state.ok ? "warning.main" : "error"} variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
              {state.error}
            </Typography>
          ) : null}
          {state.inviteUrl && !state.emailed ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, wordBreak: "break-all" }}>
              Invite link: {state.inviteUrl}
            </Typography>
          ) : null}
          <Button type="submit" variant="contained" color="secondary">
            Send invitation
          </Button>
        </Box>
      </SettingsSection>
    </Box>
  );
}
