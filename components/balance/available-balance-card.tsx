"use client";

import { useActionState, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { saveAvailableBalance } from "@/app/actions/ops";
import { MainCard } from "@/components/berry/main-card";
import { TextInput } from "@/components/forms";
import type { FormActionState } from "@/lib/form-state";
import { formatMoney } from "@/lib/money";

/** The bank balance staff type in. Shows who updated it and when; staff can edit it in place. */
export function AvailableBalanceCard({
  amount,
  updatedLabel,
  recorded,
  canEdit,
}: {
  /** Null until someone enters it. */
  amount: number | null;
  /** "Updated Oct 18, 2026 by Rida". */
  updatedLabel: string | null;
  /** Balance worked out from payments recorded in the app, shown for comparison. */
  recorded: number;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: FormActionState, formData: FormData) => {
      const result = await saveAvailableBalance(prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    {} as FormActionState,
  );

  return (
    <MainCard content={false} sx={{ height: "100%" }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            Available balance
          </Typography>
          {canEdit && !editing ? (
            <Button size="small" onClick={() => setEditing(true)} sx={{ minWidth: 0, py: 0 }}>
              {amount == null ? "Add" : "Edit"}
            </Button>
          ) : null}
        </Stack>

        {editing ? (
          <Box component="form" action={action} sx={{ mt: 1.5, display: "grid", gap: 1 }}>
            <TextInput
              label="Bank balance today"
              name="availableBalance"
              kind="decimal"
              maxDecimals={2}
              min={0}
              required
              defaultValue={amount == null ? "" : amount.toFixed(2)}
              errorMessage={state.fieldErrors?.availableBalance}
            />
            {state.error && !state.fieldErrors ? (
              <Typography variant="caption" color="error">
                {state.error}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" color="primary" size="small" disabled={pending}>
                Save
              </Button>
              <Button size="small" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
            </Stack>
          </Box>
        ) : (
          <>
            <Typography
              className="fr-money"
              sx={{
                mt: 1,
                fontSize: "1.5rem",
                fontWeight: 650,
                letterSpacing: "-0.02em",
                color: amount == null ? "text.secondary" : "primary.main",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.2,
              }}
            >
              {amount == null ? "Not entered" : formatMoney(amount)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.45 }}>
              {amount == null
                ? `Enter today's bank balance. Recorded in the app: ${formatMoney(recorded)}.`
                : `${updatedLabel ?? "Entered by your team"}. Recorded in the app: ${formatMoney(recorded)}.`}
            </Typography>
          </>
        )}
      </Box>
    </MainCard>
  );
}
