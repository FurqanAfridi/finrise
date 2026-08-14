"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { generateRecurringForMonth } from "@/app/actions/ops";
import { MonthSelect, YearSelect } from "@/components/forms";

export function GenerateRecurringForm({ year, month }: { year: number; month: number }) {
  const [state, action] = useActionState(generateRecurringForMonth, {} as { error?: string; ok?: boolean });
  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 2 }}>
      <YearSelect name="year" required defaultValue={year} />
      <MonthSelect name="month" required defaultValue={month} />
      {state.error ? (
        <Typography color="error" variant="body2">
          {state.error}
        </Typography>
      ) : null}
      {state.ok ? (
        <Typography color="success.main" variant="body2">
          Active templates added for this month.
        </Typography>
      ) : null}
      <Button type="submit" variant="outlined">
        Generate active templates
      </Button>
    </Box>
  );
}
