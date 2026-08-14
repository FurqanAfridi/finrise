"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { updateProfileAction } from "@/app/actions/profile";
import { UserAvatar } from "@/components/user-avatar";
import { TextInput } from "@/components/forms";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-ui";
import { AVATAR_TEMPLATES } from "@/lib/avatars";
import type { FormActionState } from "@/lib/form-state";

export function ProfileForm({
  name,
  email,
  avatarKey,
}: {
  name: string | null;
  email: string | null;
  avatarKey: string | null;
}) {
  const [state, action] = useActionState(updateProfileAction, {} as FormActionState);

  return (
    <Box component="form" action={action}>
      <SettingsSection
        title="Profile"
        description="Your name and avatar appear in the app. Avatars are templates; pick one that feels like you."
      >
        <SettingsRow label="Email" hint="Sign-in address. Contact an admin if you need to change it.">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {email || "Not set"}
          </Typography>
        </SettingsRow>
        <SettingsRow label="Display name">
          <TextInput label="Display name" name="name" defaultValue={name ?? ""} hideLabel kind="letters" maxLength={80} errorMessage={state.fieldErrors?.name} />
        </SettingsRow>
        <SettingsRow label="Avatar" hint="Choose a color template. Your initial sits on top." align="start">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
              gap: 1,
              width: "100%",
              maxWidth: 420,
            }}
          >
            {AVATAR_TEMPLATES.map((template) => (
              <Box
                key={template.key}
                component="label"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.75,
                  p: 1,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  "&:has(input:checked)": {
                    borderColor: "primary.main",
                    bgcolor: "action.hover",
                  },
                }}
              >
                <input
                  type="radio"
                  name="avatarKey"
                  value={template.key}
                  defaultChecked={(avatarKey || "teal") === template.key}
                  style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                />
                <UserAvatar avatarKey={template.key} name={name} email={email} size={44} />
                <Typography variant="caption" color="text.secondary">
                  {template.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </SettingsRow>
        <Box sx={{ px: 3, py: 2.5 }}>
          {state.error && !state.fieldErrors ? (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {state.error}
            </Typography>
          ) : null}
          {state.ok ? (
            <Typography color="success.main" variant="body2" sx={{ mb: 1 }}>
              Profile saved.
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" color="secondary">
              Save profile
            </Button>
          </Stack>
        </Box>
      </SettingsSection>
    </Box>
  );
}
