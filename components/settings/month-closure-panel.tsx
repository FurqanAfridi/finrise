"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { setFinanceMonthOverrideAction } from "@/app/actions/ops";
import { NativeSelect } from "@/components/forms";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-ui";
import { StatusPill } from "@/components/shared/status-pill";
import { monthName } from "@/lib/utils";

export type MonthClosureRow = {
  year: number;
  month: number;
  status: string;
  closed: boolean;
  canEdit: boolean;
};

export function MonthClosurePanel({ months }: { months: MonthClosureRow[] }) {
  const [state, action] = useActionState(setFinanceMonthOverrideAction, {});

  return (
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
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: "center" }}>
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
            <Box component="form" action={action}>
              <input type="hidden" name="year" value={row.year} />
              <input type="hidden" name="month" value={row.month} />
              <input type="hidden" name="action" value={row.closed ? "open" : "close"} />
              <Button type="submit" variant="outlined" size="small" sx={{ minHeight: 44 }}>
                {row.closed ? "Reopen month" : "Close month"}
              </Button>
            </Box>
          </Box>
        ))}
      </Stack>
      {state.error ? (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {state.error}
        </Typography>
      ) : null}
    </SettingsSection>
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
