"use client";

import { PaymentStatus } from "@prisma/client";
import { StatusPill } from "@/components/shared/status-pill";

/** @deprecated Use StatusPill — kept so existing imports keep working. */
export function StatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusPill paymentStatus={status} />;
}
