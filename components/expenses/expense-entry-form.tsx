"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { upsertExpense } from "@/app/actions/ops";
import { MonthSelect, NativeSelect, TextInput, YearSelect } from "@/components/forms";
import { formatMoney } from "@/lib/money";
import { num } from "@/lib/utils";

export type ExpenseTemplateOption = {
  id: string;
  label: string;
  categoryName: string;
  amount: number;
  isActive: boolean;
};

export function ExpenseEntryForm({
  categories,
  templates,
  defaults,
  cancelHref,
  locked,
  lockMessage,
}: {
  categories: { id: string; name: string }[];
  templates: ExpenseTemplateOption[];
  defaults: {
    id: string;
    year: number;
    month: number;
    category: string;
    label: string;
    actual: string;
    paid: string;
    method: string;
    notes: string;
  };
  cancelHref: string;
  locked: boolean;
  lockMessage?: string | null;
}) {
  const [state, action] = useActionState(upsertExpense, {} as { error?: string });
  const [templateId, setTemplateId] = useState("");
  const selected = useMemo(
    () => templates.find((row) => row.id === templateId) ?? null,
    [templateId, templates],
  );
  const category = selected?.categoryName ?? defaults.category;
  const label = selected?.label ?? defaults.label;
  const amount = selected ? String(num(selected.amount)) : "";

  if (locked) {
    return (
      <Box sx={{ gridColumn: { md: "1 / -1" } }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {lockMessage ?? "This month is closed. Past months cannot be changed."}
        </Typography>
        <Link href={cancelHref}>
          <Button type="button" variant="outlined" sx={{ mt: 2 }}>
            Back to expenses
          </Button>
        </Link>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      action={action}
      sx={{ display: "contents" }}
    >
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      {templateId ? <input type="hidden" name="templateId" value={templateId} /> : null}
      <YearSelect name="year" required defaultValue={defaults.year} />
      <MonthSelect name="month" required defaultValue={defaults.month} />
      <NativeSelect
        label="Use template"
        name="templatePicker"
        value={templateId}
        onChange={(event) => setTemplateId(event.target.value)}
      >
        <option value="">None — enter details</option>
        {templates.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label} · {row.categoryName} · {formatMoney(row.amount)}
            {row.isActive ? "" : " (inactive)"}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect label="Category" name="category" required defaultValue={category} key={`cat-${templateId}-${defaults.id}`}>
        <option value="">Select category</option>
        {categories.map((row) => (
          <option key={row.id} value={row.name}>
            {row.name}
          </option>
        ))}
      </NativeSelect>
      <TextInput
        key={`label-${templateId}-${defaults.id}`}
        label="Label"
        name="label"
        defaultValue={label}
        maxLength={120}
      />
      <TextInput
        key={`actual-${templateId}-${defaults.id}`}
        label="Actual"
        name="actual"
        kind="decimal"
        maxDecimals={2}
        min={0}
        defaultValue={selected ? amount : defaults.actual}
      />
      <TextInput
        key={`paid-${templateId}-${defaults.id}`}
        label="Paid"
        name="paid"
        kind="decimal"
        maxDecimals={2}
        min={0}
        defaultValue={selected ? amount : defaults.paid}
      />
      <TextInput label="Method" name="method" maxLength={80} defaultValue={defaults.method} />
      <Box sx={{ gridColumn: { md: "1 / -1" } }}>
        <TextInput label="Notes" name="notes" maxLength={240} defaultValue={defaults.notes} />
      </Box>
      {selected && !selected.isActive ? (
        <Typography variant="body2" color="text.secondary" sx={{ gridColumn: { md: "1 / -1" } }}>
          This template is inactive, so it will not auto-generate next month. You can still add it for this month.
        </Typography>
      ) : null}
      {state.error ? (
        <Typography color="error" variant="body2" sx={{ gridColumn: { md: "1 / -1" } }}>
          {state.error}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ gridColumn: { md: "1 / -1" } }}>
        <Button type="submit" variant="contained" color="secondary">
          {defaults.id ? "Save changes" : "Add expense"}
        </Button>
        {defaults.id ? (
          <Link href={cancelHref}>
            <Button type="button" variant="outlined">
              Cancel edit
            </Button>
          </Link>
        ) : null}
      </Stack>
    </Box>
  );
}
