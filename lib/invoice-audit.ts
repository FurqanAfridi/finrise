import type { InvoiceActivityAction, InvoiceOrigin } from "@prisma/client";
import { displayDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type CreatorSource = {
  createdAt: Date;
  origin: InvoiceOrigin;
  createdBy: { name: string | null; email: string } | null;
};

/** "Rida · Oct 15, 2026": who entered a bill and when. Shown to company admins only. */
export function createdByLabel(row: CreatorSource): string {
  const who = row.createdBy
    ? row.createdBy.name || row.createdBy.email
    : row.origin === "DAILY_CYCLE"
      ? "Automatic (daily figures)"
      : "Not recorded";
  return `${who} · ${displayDate(row.createdAt)}`;
}

export const ACTIVITY_ACTION_LABEL: Record<InvoiceActivityAction, string> = {
  CREATED: "Created",
  EDITED: "Edited",
  PAID: "Marked paid",
  APPROVED: "Approved payment",
  REJECTED: "Rejected payment",
  SENT: "Marked sent",
  EMAILED: "Emailed",
  DELETED: "Deleted",
};

/** "DEMOF-0020 · Demo Northstar Auto · 09/01 - 09/30": kept with each activity so it survives deletion. */
export function invoiceActivityLabel(row: {
  invoiceNumber?: string | null;
  periodLabel?: string | null;
  contactName: string;
}): string {
  return [row.invoiceNumber, row.contactName, row.periodLabel].filter(Boolean).join(" · ");
}

type FieldValue = number | string | Date | null | undefined | { toString(): string };
type TrackedField = { label: string; before: FieldValue; after: FieldValue; money?: boolean };

function show(value: FieldValue, money?: boolean): string {
  if (value == null || value === "") return "empty";
  if (value instanceof Date) return displayDate(value);
  if (money) return formatMoney(Number(value.toString()));
  return value.toString();
}

function same(a: FieldValue, b: FieldValue, money?: boolean): boolean {
  if (a == null || a === "") return b == null || b === "";
  if (b == null || b === "") return false;
  if (a instanceof Date || b instanceof Date) {
    return new Date(a.toString()).getTime() === new Date(b.toString()).getTime();
  }
  if (money) return Number(a.toString()) === Number(b.toString());
  return a.toString() === b.toString();
}

/** "Amount due $500.00 → $700.00; Status UNPAID → PAID", or null when nothing tracked changed. */
export function describeChanges(fields: TrackedField[]): string | null {
  const changes = fields
    .filter((field) => !same(field.before, field.after, field.money))
    .map((field) => `${field.label} ${show(field.before, field.money)} → ${show(field.after, field.money)}`);
  return changes.length ? changes.join("; ") : null;
}

/**
 * Records one action on an invoice or payable. Logging must never undo the action that already
 * happened, so failures are reported to the server log instead of thrown.
 */
export async function logInvoiceActivity(input: {
  tenantId: string;
  userId: string | null;
  kind: "buyer" | "publisher";
  invoiceId: string;
  invoiceLabel: string;
  action: InvoiceActivityAction;
  details?: string | null;
}) {
  try {
    await prisma.invoiceActivity.create({ data: { ...input, details: input.details ?? null } });
  } catch (error) {
    console.error("Could not record invoice activity", error);
  }
}
