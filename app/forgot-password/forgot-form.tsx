"use client";

import { useActionState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { TextInput } from "@/components/forms";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, {} as {
    error?: string;
    ok?: boolean;
    fieldErrors?: Record<string, string>;
  });

  if (state.ok) {
    return (
      <Box sx={{ width: 1, display: "grid", gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", lineHeight: 1.6 }}>
          If that email is on an account, we sent a reset link. Check your inbox and spam folder.
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" sx={{ textAlign: "center" }}>
          <Link href="/login" style={{ color: "inherit", fontWeight: 600 }}>
            Back to sign in
          </Link>
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" action={action} sx={{ width: 1, display: "grid", gap: 2 }}>
      <TextInput
        name="email"
        type="email"
        label="Email Address"
        required
        autoComplete="email"
        size="medium"
        errorMessage={state.fieldErrors?.email}
      />
      {state.error && !state.fieldErrors ? (
        <Typography color="error" variant="body2">
          {state.error}
        </Typography>
      ) : null}
      <Button color="secondary" fullWidth size="large" type="submit" variant="contained" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </Box>
  );
}
