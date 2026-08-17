"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconInfoCircle,
  IconBan,
  type Icon,
} from "@tabler/icons-react";
import { InvoiceStatus, PaymentStatus } from "@prisma/client";
import { INVOICE_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/status";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

type PillSpec = {
  label: string;
  tone: Tone;
  icon: Icon;
};

const TONE_SX: Record<Tone, { bg: string; color: string }> = {
  success: { bg: "var(--fr-success-muted)", color: "var(--fr-success)" },
  warning: { bg: "var(--fr-warning-muted)", color: "var(--fr-warning)" },
  danger: { bg: "var(--fr-danger-muted)", color: "var(--fr-danger)" },
  info: { bg: "var(--fr-info-muted)", color: "var(--fr-info)" },
  neutral: { bg: "var(--fr-surface-muted)", color: "var(--fr-text-muted)" },
};

const PAYMENT_PILL: Record<PaymentStatus, PillSpec> = {
  PAID: { label: PAYMENT_STATUS_LABEL.PAID, tone: "success", icon: IconCircleCheck },
  EXTRA_PAID: { label: PAYMENT_STATUS_LABEL.EXTRA_PAID, tone: "success", icon: IconCircleCheck },
  COMPENSATED: { label: PAYMENT_STATUS_LABEL.COMPENSATED, tone: "success", icon: IconCircleCheck },
  UNPAID: { label: PAYMENT_STATUS_LABEL.UNPAID, tone: "warning", icon: IconClock },
  ON_HOLD: { label: PAYMENT_STATUS_LABEL.ON_HOLD, tone: "warning", icon: IconClock },
  WAITING_FOR_INV: { label: PAYMENT_STATUS_LABEL.WAITING_FOR_INV, tone: "warning", icon: IconClock },
  WAITING_ON_BUYER: { label: PAYMENT_STATUS_LABEL.WAITING_ON_BUYER, tone: "warning", icon: IconClock },
  BARGAINING: { label: PAYMENT_STATUS_LABEL.BARGAINING, tone: "warning", icon: IconClock },
  TBD: { label: PAYMENT_STATUS_LABEL.TBD, tone: "neutral", icon: IconInfoCircle },
  NO_BILLABLES: { label: PAYMENT_STATUS_LABEL.NO_BILLABLES, tone: "neutral", icon: IconBan },
  BUYER_LOST: { label: PAYMENT_STATUS_LABEL.BUYER_LOST, tone: "danger", icon: IconBan },
  HOLD_ON_TCPA: { label: PAYMENT_STATUS_LABEL.HOLD_ON_TCPA, tone: "danger", icon: IconAlertTriangle },
};

const INVOICE_PILL: Record<InvoiceStatus, PillSpec> = {
  SENT: { label: INVOICE_STATUS_LABEL.SENT, tone: "info", icon: IconCircleCheck },
  NOT_SENT: { label: INVOICE_STATUS_LABEL.NOT_SENT, tone: "neutral", icon: IconClock },
  NO_BILLABLES: { label: INVOICE_STATUS_LABEL.NO_BILLABLES, tone: "neutral", icon: IconBan },
};

const SPECIAL: Record<string, PillSpec> = {
  overdue: { label: "Overdue", tone: "danger", icon: IconAlertTriangle },
  pending_approval: { label: "Needs approval", tone: "warning", icon: IconClock },
  active: { label: "Active", tone: "success", icon: IconCircleCheck },
  inactive: { label: "Inactive", tone: "neutral", icon: IconBan },
  closed: { label: "Closed", tone: "neutral", icon: IconBan },
  draft: { label: "Draft", tone: "info", icon: IconInfoCircle },
  invoiced: { label: "On invoice", tone: "success", icon: IconCircleCheck },
  on_draft: { label: "On draft", tone: "info", icon: IconInfoCircle },
  unbilled: { label: "Not invoiced", tone: "warning", icon: IconClock },
  variance: { label: "Variance", tone: "warning", icon: IconAlertTriangle },
  missing: { label: "Missed day", tone: "warning", icon: IconClock },
  due_soon: { label: "Due soon", tone: "info", icon: IconClock },
  paid: { label: "Paid", tone: "success", icon: IconCircleCheck },
  compatible: { label: "Compatible", tone: "success", icon: IconCircleCheck },
  needs_mapping: { label: "Needs mapping", tone: "warning", icon: IconClock },
  matched: { label: "Matched", tone: "success", icon: IconCircleCheck },
  not_in_sheet: { label: "Not in sheet", tone: "warning", icon: IconAlertTriangle },
  unused: { label: "Not used", tone: "neutral", icon: IconBan },
};

export function StatusPill({
  paymentStatus,
  invoiceStatus,
  kind,
  label,
}: {
  paymentStatus?: PaymentStatus;
  invoiceStatus?: InvoiceStatus;
  kind?:
    | "overdue"
    | "pending_approval"
    | "active"
    | "inactive"
    | "closed"
    | "draft"
    | "invoiced"
    | "on_draft"
    | "unbilled"
    | "variance"
    | "missing"
    | "due_soon"
    | "paid"
    | "compatible"
    | "needs_mapping"
    | "matched"
    | "not_in_sheet"
    | "unused";
  label?: string;
}) {
  const spec =
    (kind ? SPECIAL[kind] : null) ||
    (paymentStatus ? PAYMENT_PILL[paymentStatus] : null) ||
    (invoiceStatus ? INVOICE_PILL[invoiceStatus] : null) ||
    ({ label: label || "Unknown", tone: "neutral" as const, icon: IconInfoCircle } satisfies PillSpec);

  const colors = TONE_SX[spec.tone];
  const Icon = spec.icon;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.25,
        py: 0.35,
        borderRadius: "var(--fr-radius-pill)",
        bgcolor: colors.bg,
        color: colors.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        maxWidth: "100%",
        flexShrink: 0,
      }}
    >
      <Icon size={14} stroke={2} aria-hidden />
      <Typography component="span" sx={{ fontSize: 12, fontWeight: 600, color: "inherit" }}>
        {spec.label}
      </Typography>
    </Box>
  );
}
