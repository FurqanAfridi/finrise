"use client";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { InvoiceStatus, PaymentStatus, RateType } from "@prisma/client";
import {
  INVOICE_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  RATE_TYPE_LABEL,
} from "@/lib/status";

export type TextInputKind = "text" | "letters" | "int" | "decimal" | "phone" | "currency";

function sanitizeLetters(value: string) {
  return value.replace(/[^\p{L}\s'.-]/gu, "").replace(/\s+/g, " ");
}

function sanitizeInt(value: string) {
  return value.replace(/\D/g, "");
}

function sanitizeDecimal(value: string, maxDecimals = 4) {
  let next = value.replace(/[^\d.]/g, "");
  const firstDot = next.indexOf(".");
  if (firstDot !== -1) {
    next = `${next.slice(0, firstDot + 1)}${next.slice(firstDot + 1).replace(/\./g, "")}`;
    const [whole, fraction = ""] = next.split(".");
    next = `${whole}.${fraction.slice(0, maxDecimals)}`;
  }
  return next;
}

function sanitizePhone(value: string) {
  return value.replace(/[^\d+\-\s()]/g, "").replace(/[A-Za-z]/g, "");
}

function sanitizeCurrency(value: string) {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
}

function clampNumberString(value: string, min?: number, max?: number) {
  if (!value || min == null && max == null) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  let next = n;
  if (min != null && next < min) next = min;
  if (max != null && next > max) next = max;
  return String(next);
}

/** Shared props so outlined labels never overlap native <select> values. */
export const nativeSelectSlotProps = {
  select: { native: true as const },
  inputLabel: { shrink: true },
};

export function NativeSelect({
  label,
  name,
  defaultValue,
  children,
  required,
  hideLabel,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
  required?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <TextField
      select
      slotProps={{
        ...nativeSelectSlotProps,
        inputLabel: hideLabel ? undefined : { shrink: true },
        htmlInput: { "aria-label": label },
      }}
      size="small"
      fullWidth
      label={hideLabel ? undefined : label}
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
    >
      {children}
    </TextField>
  );
}

export function TextInput({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  multiline,
  rows,
  numeric,
  kind,
  hideLabel,
  maxLength,
  min,
  max,
  maxDecimals = 4,
  helperText,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  /** @deprecated Prefer `kind` */
  numeric?: "int" | "decimal";
  kind?: TextInputKind;
  hideLabel?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Max digits after the decimal for `kind="decimal"`. */
  maxDecimals?: number;
  helperText?: string;
}) {
  const resolvedKind: TextInputKind =
    kind ?? (numeric === "int" ? "int" : numeric === "decimal" ? "decimal" : "text");
  // Keep numeric kinds as text so we fully control allowed characters (type=number allows e/+/−).
  const resolvedType =
    resolvedKind === "int" ||
    resolvedKind === "decimal" ||
    resolvedKind === "phone" ||
    resolvedKind === "currency" ||
    resolvedKind === "letters"
      ? "text"
      : type;

  const inputMode =
    resolvedKind === "int" || resolvedKind === "phone"
      ? "numeric"
      : resolvedKind === "decimal"
        ? "decimal"
        : undefined;

  const defaultMaxLength =
    maxLength ??
    (resolvedKind === "phone"
      ? 12
      : resolvedKind === "currency"
        ? 3
        : resolvedKind === "letters"
          ? 80
          : resolvedKind === "int"
            ? 10
            : resolvedKind === "decimal"
              ? 16
              : undefined);

  return (
    <TextField
      size="small"
      fullWidth
      label={hideLabel ? undefined : label}
      name={name}
      type={resolvedType}
      defaultValue={defaultValue ?? ""}
      required={required}
      multiline={multiline}
      minRows={multiline ? rows ?? 3 : undefined}
      helperText={helperText}
      slotProps={{
        inputLabel:
          !hideLabel && (resolvedType === "date" || multiline || helperText)
            ? { shrink: true }
            : undefined,
        htmlInput: {
          "aria-label": label,
          inputMode,
          maxLength: defaultMaxLength,
          min: min != null ? String(min) : undefined,
          max: max != null ? String(max) : undefined,
          ...(resolvedType === "date" ? { min: "1990-01-01", max: "2100-12-31" } : {}),
          autoComplete:
            resolvedKind === "phone"
              ? "tel-national"
              : resolvedKind === "letters"
                ? "name"
                : undefined,
          onInput: (event: React.FormEvent<HTMLInputElement>) => {
            const el = event.currentTarget;
            let next = el.value;
            if (resolvedKind === "letters") next = sanitizeLetters(next);
            else if (resolvedKind === "int") next = sanitizeInt(next);
            else if (resolvedKind === "decimal") next = sanitizeDecimal(next, maxDecimals);
            else if (resolvedKind === "phone") next = digitsOnlyPhone(next);
            else if (resolvedKind === "currency") next = sanitizeCurrency(next);
            if (defaultMaxLength != null && next.length > defaultMaxLength) {
              next = next.slice(0, defaultMaxLength);
            }
            el.value = next;
          },
          onBlur:
            resolvedKind === "int" || resolvedKind === "decimal"
              ? (event: React.FocusEvent<HTMLInputElement>) => {
                  const el = event.currentTarget;
                  if (!el.value) return;
                  el.value = clampNumberString(el.value, min, max);
                }
              : undefined,
        },
      }}
    />
  );
}

function digitsOnlyPhone(value: string) {
  return sanitizePhone(value).replace(/\D/g, "");
}

export function RateTypeSelect({ name, defaultValue }: { name: string; defaultValue?: RateType }) {
  return (
    <NativeSelect label="Rate type" name={name} defaultValue={defaultValue ?? RateType.CPL}>
      {Object.values(RateType).map((value) => (
        <option key={value} value={value}>
          {RATE_TYPE_LABEL[value]}
        </option>
      ))}
    </NativeSelect>
  );
}

export function PaymentStatusSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: PaymentStatus;
}) {
  return (
    <NativeSelect label="Payment status" name={name} defaultValue={defaultValue ?? PaymentStatus.UNPAID}>
      {Object.values(PaymentStatus).map((value) => (
        <option key={value} value={value}>
          {PAYMENT_STATUS_LABEL[value]}
        </option>
      ))}
    </NativeSelect>
  );
}

export function InvoiceStatusSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: InvoiceStatus;
}) {
  return (
    <NativeSelect label="Invoice status" name={name} defaultValue={defaultValue ?? InvoiceStatus.NOT_SENT}>
      {Object.values(InvoiceStatus).map((value) => (
        <option key={value} value={value}>
          {INVOICE_STATUS_LABEL[value]}
        </option>
      ))}
    </NativeSelect>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <FormControl fullWidth size="small">
      <InputLabel shrink>{label}</InputLabel>
      {children}
    </FormControl>
  );
}

export { MenuItem };
