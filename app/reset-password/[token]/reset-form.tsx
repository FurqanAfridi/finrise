"use client";

import { useActionState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { completePasswordResetAction } from "@/app/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completePasswordResetAction, {} as { error?: string; ok?: boolean });

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
      <TextField
        name="password"
        type="password"
        label="New password"
        fullWidth
        required
        autoComplete="new-password"
        slotProps={{ htmlInput: { minLength: 8 } }}
      />
      <TextField
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        fullWidth
        required
        autoComplete="new-password"
        slotProps={{ htmlInput: { minLength: 8 } }}
      />
      {state.error ? (
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
