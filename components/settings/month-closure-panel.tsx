"use client";

import { useActionState, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { deleteFinanceMonthHistoryAction, setFinanceMonthOverrideAction } from "@/app/actions/ops";
import { NativeSelect } from "@/components/forms";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-ui";
import { StatusPill } from "@/components/shared/status-pill";
import type { FormActionState } from "@/lib/form-state";
import { monthName } from "@/lib/utils";

export type MonthClosureRow = {
  year: number;
  month: number;
  status: string;
  closed: boolean;
  canEdit: boolean;
};

export function MonthClosurePanel({ months }: { months: MonthClosureRow[] }) {
  const [state, action] = useActionState(setFinanceMonthOverrideAction, {} as FormActionState);
  const [wipeState, wipeAction, wipePending] = useActionState(
    deleteFinanceMonthHistoryAction,
    {} as FormActionState,
  );
  const [wipeTarget, setWipeTarget] = useState<{ year: number; month: number } | null>(null);
  const [confirmText, setConfirmText] = useState("");

  return (
    <>
      <SettingsSection
        title="Month closure"
        description="Close a month to stop accountants and brokers from changing invoices, figures, and expenses. Reopen when they need to catch up."
      >
        <Stack spacing={1.25}>
          {months.map((row) => (
            <Box
              key={`${row.year}-${row.month}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
                py: 1.25,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {monthName(row.month)} {row.year}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: "center", flexWrap: "wrap" }}>
                  <StatusPill kind={row.closed ? "closed" : "active"} />
                  <Typography variant="caption" color="text.secondary">
                    {row.status}
                  </Typography>
                  {!row.canEdit && row.closed ? (
                    <Typography variant="caption" color="text.secondary">
                      Accountants cannot edit
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Box component="form" action={action}>
                  <input type="hidden" name="year" value={row.year} />
                  <input type="hidden" name="month" value={row.month} />
                  <input type="hidden" name="action" value={row.closed ? "open" : "close"} />
                  <Button type="submit" variant="outlined" size="small" sx={{ minHeight: 44 }}>
                    {row.closed ? "Reopen month" : "Close month"}
                  </Button>
                </Box>
                <Button
                  type="button"
                  color="error"
                  variant="text"
                  size="small"
                  sx={{ minHeight: 44 }}
                  onClick={() => {
                    setWipeTarget({ year: row.year, month: row.month });
                    setConfirmText("");
                  }}
                >
                  Delete history
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
        {state.error ? (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {state.error}
          </Typography>
        ) : null}
      </SettingsSection>

      {wipeTarget ? (
        <SettingsSection
          title={`Delete ${monthName(wipeTarget.month)} ${wipeTarget.year}`}
          description="Permanently removes buyer invoices, publisher payables, daily figures, and expenses for this month. Month close/open status is kept. This cannot be undone."
        >
          <Box
            component="form"
            action={wipeAction}
            onSubmit={(event) => {
              const label = `${monthName(wipeTarget.month)} ${wipeTarget.year}`;
              if (
                !window.confirm(
                  `Delete all ledger history for ${label}? Buyer invoices, publisher payables, daily figures, and expenses will be removed.`,
                )
              ) {
                event.preventDefault();
              }
            }}
            sx={{ display: "grid", gap: 2, maxWidth: 480 }}
          >
            <input type="hidden" name="year" value={wipeTarget.year} />
            <input type="hidden" name="month" value={wipeTarget.month} />
            <TextField
              size="small"
              fullWidth
              required
              label={`Type ${monthName(wipeTarget.month)} ${wipeTarget.year} to confirm`}
              name="confirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              error={Boolean(wipeState.fieldErrors?.confirm)}
              helperText={wipeState.fieldErrors?.confirm}
              autoComplete="off"
            />
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              <Button
                type="submit"
                color="error"
                variant="contained"
                disabled={wipePending}
                sx={{ minHeight: 44 }}
              >
                {wipePending ? "Deleting…" : "Delete month history"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                sx={{ minHeight: 44 }}
                onClick={() => {
                  setWipeTarget(null);
                  setConfirmText("");
                }}
              >
                Cancel
              </Button>
            </Stack>
            {wipeState.error && !wipeState.fieldErrors ? (
              <Typography color="error" variant="body2">
                {wipeState.error}
              </Typography>
            ) : null}
            {wipeState.ok && wipeState.message ? (
              <Typography variant="body2" color="success.main">
                {wipeState.message}
              </Typography>
            ) : null}
          </Box>
        </SettingsSection>
      ) : null}
    </>
  );
}

export function MonthAutoCloseField({
  monthAutoCloseDay,
  errorMessage,
}: {
  monthAutoCloseDay: number | null;
  errorMessage?: string;
}) {
  return (
    <SettingsRow
      label="Auto-close day"
      hint="Optional. On this day each month, the previous month closes automatically. Leave on manual only if you prefer to close months yourself."
    >
      <Box sx={{ maxWidth: 220, width: "100%" }}>
        <NativeSelect
          label="Auto-close day"
          name="monthAutoCloseDay"
          defaultValue={monthAutoCloseDay == null ? "" : String(monthAutoCloseDay)}
          hideLabel
          errorMessage={errorMessage}
        >
          <option value="">Manual only</option>
          {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
            <option key={day} value={day}>
              Day {day} of the following month
            </option>
          ))}
        </NativeSelect>
      </Box>
    </SettingsRow>
  );
}
