import {
  InvoiceStatus,
  PaymentStatus,
  RateType,
  TenantRole,
} from "@prisma/client";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  ON_HOLD: "On hold",
  BUYER_LOST: "Buyer lost",
  NO_BILLABLES: "No billables",
  TBD: "TBD",
  WAITING_FOR_INV: "Waiting for invoice",
  BARGAINING: "Bargaining",
  COMPENSATED: "Compensated",
  EXTRA_PAID: "Extra paid",
  HOLD_ON_TCPA: "Hold on TCPA",
  WAITING_ON_BUYER: "Waiting on buyer",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  SENT: "Sent",
  NOT_SENT: "Not sent",
  NO_BILLABLES: "No billables",
};

export const TENANT_ROLE_LABEL: Record<TenantRole, string> = {
  ADMIN: "Admin",
  BROKER: "Broker",
  ACCOUNTANT: "Accountant",
  PUBLISHER: "Publisher",
  BUYER: "Buyer",
};

export const RATE_TYPE_LABEL: Record<RateType, string> = {
  CPL: "CPL",
  CPA: "CPA",
  DYNAMIC: "Dynamic",
  OTHER: "Other",
  FLAT: "Flat",
  PROFIT_SHARE: "Profit share",
};

export function parseRateType(raw: string | null | undefined): RateType {
  const value = (raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (value === "CPL") return RateType.CPL;
  if (value === "CPA") return RateType.CPA;
  if (value === "DYNAMIC") return RateType.DYNAMIC;
  if (value === "FLAT") return RateType.FLAT;
  if (value === "PROFIT_SHARE" || value === "PROFITSHARE" || value.includes("PROFIT")) {
    return RateType.PROFIT_SHARE;
  }
  return RateType.OTHER;
}

export function parsePaymentStatus(raw: string | null | undefined): PaymentStatus {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return PaymentStatus.UNPAID;
  if (value === "paid") return PaymentStatus.PAID;
  if (value === "unpaid") return PaymentStatus.UNPAID;
  if (value.includes("buyer lost")) return PaymentStatus.BUYER_LOST;
  if (value.includes("tcpa")) return PaymentStatus.HOLD_ON_TCPA;
  if (value.includes("on hold")) return PaymentStatus.ON_HOLD;
  if (value.includes("no billable")) return PaymentStatus.NO_BILLABLES;
  if (value.includes("bargain")) return PaymentStatus.BARGAINING;
  if (value.includes("waiting for inv")) return PaymentStatus.WAITING_FOR_INV;
  if (value.includes("compenst") || value.includes("compensat")) {
    return PaymentStatus.COMPENSATED;
  }
  if (value.includes("extra paid")) return PaymentStatus.EXTRA_PAID;
  if (value.includes("waiting on buyer") || value.includes("biweekly")) {
    return PaymentStatus.WAITING_ON_BUYER;
  }
  if (value === "tbd" || value.includes("wil send") || value.includes("will send")) {
    return PaymentStatus.TBD;
  }
  return PaymentStatus.UNPAID;
}

export function parseInvoiceStatus(raw: string | null | undefined): InvoiceStatus {
  const value = (raw ?? "").trim().toLowerCase();
  if (value.includes("no billable")) return InvoiceStatus.NO_BILLABLES;
  if (value.includes("sent")) return InvoiceStatus.SENT;
  return InvoiceStatus.NOT_SENT;
}

export const OPEN_BUYER_STATUSES: PaymentStatus[] = [
  PaymentStatus.UNPAID,
  PaymentStatus.ON_HOLD,
  PaymentStatus.TBD,
  PaymentStatus.BARGAINING,
  PaymentStatus.WAITING_ON_BUYER,
];

export const OPEN_PUBLISHER_STATUSES: PaymentStatus[] = [
  PaymentStatus.UNPAID,
  PaymentStatus.ON_HOLD,
  PaymentStatus.TBD,
  PaymentStatus.WAITING_FOR_INV,
  PaymentStatus.HOLD_ON_TCPA,
  PaymentStatus.WAITING_ON_BUYER,
];
