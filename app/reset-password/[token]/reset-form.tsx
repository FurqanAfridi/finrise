"use client";

import { useActionState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { completePasswordResetAction } from "@/app/actions/auth";
import { TextInput } from "@/components/forms";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completePasswordResetAction, {} as {
    error?: string;
    ok?: boolean;
    fieldErrors?: Record<string, string>;
  });

  if (state.ok) {
    return (
      <Box sx={{ width: 1, display: "grid", gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", lineHeight: 1.6 }}>
          Your password is updated. You can sign in with it now.
        </Typography>
        <Button component={Link} href="/login" color="secondary" fullWidth size="large" variant="contained">
          Sign in
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" action={action} sx={{ width: 1, display: "grid", gap: 2 }}>
      <input type="hidden" name="token" value={token} />
      <TextInput
        name="password"
        type="password"
        label="New password"
        required
        autoComplete="new-password"
        size="medium"
        errorMessage={state.fieldErrors?.password}
      />
      <TextInput
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        required
        autoComplete="new-password"
        size="medium"
        errorMessage={state.fieldErrors?.confirmPassword}
      />
      {state.error && !state.fieldErrors ? (
        <Typography color="error" variant="body2">
          {state.error}
        </Typography>
      ) : null}
      <Button color="secondary" fullWidth size="large" type="submit" variant="contained" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </Box>
  );
}
