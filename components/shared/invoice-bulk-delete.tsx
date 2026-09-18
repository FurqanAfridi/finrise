"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { FormActionState } from "@/lib/form-state";

type BulkDeleteAction = (
  prev: FormActionState,
  formData: FormData,
) => Promise<FormActionState>;

export function useInvoiceSelection(rowIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const idSet = useMemo(() => new Set(rowIds), [rowIds]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => idSet.has(id)));
  }, [idSet]);

  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  function toggleAll() {
    setSelectedIds(allSelected ? [] : [...rowIds]);
  }

  function toggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id],
    );
  }

  function clear() {
    setSelectedIds([]);
  }

  return {
    selectedIds,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clear,
  };
}

export function InvoiceBulkDeleteBar({
  selectedIds,
  action,
  noun,
  onCleared,
}: {
  selectedIds: string[];
  action: BulkDeleteAction;
  noun: "invoice" | "payable";
  onCleared?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {} as FormActionState);
  const handledOk = useRef(false);
  const count = selectedIds.length;
  const plural = count === 1 ? noun : `${noun}s`;

  useEffect(() => {
    if (!state.ok || handledOk.current) return;
    handledOk.current = true;
    onCleared?.();
    router.refresh();
  }, [state.ok, onCleared, router]);

  useEffect(() => {
    if (!state.ok) handledOk.current = false;
  }, [state.ok]);

  if (count === 0 && !state.error && !state.message) return null;

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "var(--fr-surface-muted)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography variant="body2" color="text.secondary">
          {count === 0 ? "No rows selected" : `${count} ${plural} selected`}
        </Typography>
        {count > 0 ? (
          <Box
            component="form"
            action={formAction}
            onSubmit={(event) => {
              handledOk.current = false;
              const message =
                count === 1
                  ? `Delete this ${noun}? This cannot be undone.`
                  : `Delete ${count} ${plural}? This cannot be undone.`;
              if (!window.confirm(message)) event.preventDefault();
            }}
          >
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="id" value={id} />
            ))}
            <Button type="submit" color="error" variant="outlined" disabled={pending} sx={{ minHeight: 44 }}>
              {pending ? "Deleting…" : "Delete selected"}
            </Button>
          </Box>
        ) : null}
      </Stack>
      {state.error ? (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {state.error}
        </Typography>
      ) : null}
      {state.ok && state.message ? (
        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
          {state.message}
        </Typography>
      ) : null}
    </Box>
  );
}

export function InvoiceSelectCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <Checkbox
      size="small"
      checked={checked}
      indeterminate={indeterminate}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      slotProps={{ input: { "aria-label": label } }}
      sx={{ p: 0.75 }}
    />
  );
}
