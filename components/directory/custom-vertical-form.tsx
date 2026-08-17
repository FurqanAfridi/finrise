"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { upsertDirectory } from "@/app/actions/ops";
import { TextInput } from "@/components/forms";
import type { FormActionState } from "@/lib/form-state";

export function CustomVerticalForm() {
  const [state, action] = useActionState(upsertDirectory, {} as FormActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
      <input type="hidden" name="kind" value="vertical" />
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
        The PPC catalog is already loaded. Add a custom vertical if the offer is not in the list.
      </Typography>
      <TextInput label="Vertical name" name="name" required maxLength={120} errorMessage={errors.name} />
      {state.error && !state.fieldErrors ? (
        <Typography color="error" variant="body2">
          {state.error}
        </Typography>
      ) : null}
      {state.ok ? (
        <Typography color="success.main" variant="body2">
          Custom vertical saved.
        </Typography>
      ) : null}
      <Stack direction="row">
        <Button type="submit" variant="contained" color="secondary" sx={{ minHeight: 44 }}>
          Add custom vertical
        </Button>
      </Stack>
    </Box>
  );
}
