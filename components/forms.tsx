"use client";

import { useState } from "react";
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
  value,
  onChange,
  children,
  required,
  hideLabel,
  errorMessage,
  helperText,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  children: React.ReactNode;
  required?: boolean;
  hideLabel?: boolean;
  errorMessage?: string;
  helperText?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
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
      value={current}
      onChange={(event) => {
        if (!controlled) setInner(event.target.value);
        onChange?.(event);
      }}
      required={required}
      error={Boolean(errorMessage)}
      helperText={errorMessage || helperText}
    >
      {children}
    </TextField>
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const COMMON_NET_DAYS = [0, 7, 14, 15, 21, 30, 45, 60, 90];

function yearChoices(extra?: string | number | null) {
  const now = new Date().getUTCFullYear();
  const years = new Set<number>();
  for (let y = now + 1; y >= now - 8; y -= 1) years.add(y);
  const parsed = Number(extra);
  if (Number.isFinite(parsed) && parsed >= 1990 && parsed <= 2100) years.add(parsed);
  return [...years].sort((a, b) => b - a);
}

export function YearSelect({
  name = "year",
  label = "Year",
  defaultValue,
  required,
  allowEmpty,
  emptyLabel = "All years",
  hideLabel,
}: {
  name?: string;
  label?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  hideLabel?: boolean;
}) {
  const value = defaultValue == null || defaultValue === "" ? "" : String(defaultValue);
  return (
    <NativeSelect label={label} name={name} defaultValue={value} required={required} hideLabel={hideLabel}>
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {yearChoices(value).map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </NativeSelect>
  );
}

export function MonthSelect({
  name = "month",
  label = "Month",
  defaultValue,
  required,
  allowEmpty,
  emptyLabel = "All months",
  hideLabel,
}: {
  name?: string;
  label?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  hideLabel?: boolean;
}) {
  const raw = defaultValue == null ? "" : String(defaultValue);
  const value = raw === "all" ? "" : raw;
  return (
    <NativeSelect label={label} name={name} defaultValue={value} required={required} hideLabel={hideLabel}>
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {MONTH_NAMES.map((month, index) => (
        <option key={month} value={index + 1}>
          {month}
        </option>
      ))}
    </NativeSelect>
  );
}

export function DayOfMonthSelect({
  name = "dayOfMonth",
  label = "Day of month",
  defaultValue,
  required,
  max = 28,
  hideLabel,
  errorMessage,
}: {
  name?: string;
  label?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  max?: number;
  hideLabel?: boolean;
  errorMessage?: string;
}) {
  const value = defaultValue == null || defaultValue === "" ? "1" : String(defaultValue);
  return (
    <NativeSelect label={label} name={name} defaultValue={value} required={required} hideLabel={hideLabel} errorMessage={errorMessage}>
      {Array.from({ length: max }, (_, i) => i + 1).map((day) => (
        <option key={day} value={day}>
          {day}
        </option>
      ))}
    </NativeSelect>
  );
}

export function NetDaysSelect({
  name = "paymentTermsDays",
  label = "NET days",
  defaultValue,
  value,
  onChange,
  required,
  hideLabel,
  errorMessage,
  helperText,
}: {
  name?: string;
  label?: string;
  defaultValue?: string | number | null;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  hideLabel?: boolean;
  errorMessage?: string;
  helperText?: string;
}) {
  const parsed = Number(value ?? defaultValue);
  const selected = Number.isFinite(parsed) ? String(parsed) : "7";
  const days = COMMON_NET_DAYS.includes(Number(selected))
    ? COMMON_NET_DAYS
    : [...COMMON_NET_DAYS, Number(selected)].sort((a, b) => a - b);
  return (
    <NativeSelect
      label={label}
      name={name}
      required={required}
      hideLabel={hideLabel}
      errorMessage={errorMessage}
      helperText={helperText}
      {...(value !== undefined
        ? { value: selected, onChange }
        : { defaultValue: selected })}
    >
      {days.map((day) => (
        <option key={day} value={day}>
          {day === 0 ? "Due on receipt" : `NET ${day}`}
        </option>
      ))}
    </NativeSelect>
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
  errorMessage,
  size = "small",
  autoComplete,
  placeholder,
  startAdornment,
  sanitize,
  onValueChange,
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
  errorMessage?: string;
  size?: "small" | "medium";
  autoComplete?: string;
  placeholder?: string;
  startAdornment?: React.ReactNode;
  sanitize?: (value: string) => string;
  onValueChange?: (value: string) => void;
}) {
  const resolvedKind: TextInputKind =
    kind ?? (numeric === "int" ? "int" : numeric === "decimal" ? "decimal" : "text");
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

  const [value, setValue] = useState(String(defaultValue ?? ""));
  const invalid = Boolean(errorMessage);

  function apply(raw: string) {
    let next = raw;
    if (resolvedKind === "letters") next = sanitizeLetters(next);
    else if (resolvedKind === "int") next = sanitizeInt(next);
    else if (resolvedKind === "decimal") next = sanitizeDecimal(next, maxDecimals);
    else if (resolvedKind === "phone") next = digitsOnlyPhone(next);
    if (resolvedKind === "currency") next = sanitizeCurrency(next);
    if (sanitize) next = sanitize(next);
    if (defaultMaxLength != null && next.length > defaultMaxLength) {
      next = next.slice(0, defaultMaxLength);
    }
    setValue(next);
    onValueChange?.(next);
  }

  return (
    <TextField
      size={size}
      fullWidth
      label={hideLabel ? undefined : label}
      name={name}
      type={resolvedType}
      value={value}
      onChange={(event) => apply(event.target.value)}
      onBlur={
        resolvedKind === "int" || resolvedKind === "decimal"
          ? () => {
              if (!value) return;
              setValue(clampNumberString(value, min, max));
            }
          : undefined
      }
      required={required}
      multiline={multiline}
      minRows={multiline ? rows ?? 3 : undefined}
      placeholder={placeholder}
      error={invalid}
      helperText={errorMessage || helperText}
      slotProps={{
        input: startAdornment ? { startAdornment } : undefined,
        inputLabel:
          !hideLabel && (resolvedType === "date" || multiline || helperText || invalid)
            ? { shrink: true }
            : undefined,
        htmlInput: {
          "aria-label": label,
          "aria-invalid": invalid || undefined,
          inputMode,
          maxLength: defaultMaxLength,
          min: min != null ? String(min) : undefined,
          max: max != null ? String(max) : undefined,
          ...(resolvedType === "date" ? { min: "1990-01-01", max: "2100-12-31" } : {}),
          autoComplete:
            autoComplete ??
            (resolvedKind === "phone"
              ? "tel-national"
              : resolvedKind === "letters"
                ? "name"
                : undefined),
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
