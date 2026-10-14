import { cents, money, type Decimal } from "./decimal";

export type CashLedgerKind = "BUYER_PAYMENT" | "PUBLISHER_PAYMENT" | "EXPENSE" | "PARTNER_WITHDRAWAL";

export const CASH_LEDGER_KIND_LABEL: Record<CashLedgerKind, string> = {
  BUYER_PAYMENT: "Buyer payment",
  PUBLISHER_PAYMENT: "Publisher payment",
  EXPENSE: "Expense",
  PARTNER_WITHDRAWAL: "Partner withdrawal",
};

/** One movement of cash. Positive amounts come in, negative amounts go out. */
export type CashLedgerEntry = {
  id: string;
  date: Date;
  kind: CashLedgerKind;
  description: string;
  reference: string | null;
  amount: Decimal;
  href?: string;
};

export type CashLedgerRow = CashLedgerEntry & {
  moneyIn: Decimal;
  moneyOut: Decimal;
  balance: Decimal;
};

export type CashLedger = {
  /** Opening balance plus everything before `from` — the first row's starting point. */
  broughtForward: Decimal;
  rows: CashLedgerRow[];
  totalIn: Decimal;
  totalOut: Decimal;
  /** Balance after the last row shown. */
  closingBalance: Decimal;
  /** Balance today across all history, ignoring the date range. */
  availableBalance: Decimal;
};

const KIND_ORDER: Record<CashLedgerKind, number> = {
  BUYER_PAYMENT: 0,
  PUBLISHER_PAYMENT: 1,
  EXPENSE: 2,
  PARTNER_WITHDRAWAL: 3,
};

/**
 * Builds a running-balance sheet, oldest first. `from` is inclusive and `to` is exclusive.
 * Entries dated before `openingDate` are treated as already counted in `opening`.
 */
export function buildCashLedger(
  entries: CashLedgerEntry[],
  options: {
    opening?: Decimal;
    openingDate?: Date | null;
    from?: Date | null;
    to?: Date | null;
    kinds?: CashLedgerKind[];
  } = {},
): CashLedger {
  const opening = cents(options.opening ?? 0);
  const counted = entries
    .filter((entry) => !options.openingDate || entry.date >= options.openingDate)
    .sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.id.localeCompare(b.id),
    );

  let balance = opening;
  let broughtForward = opening;
  let totalIn = money(0);
  let totalOut = money(0);
  const rows: CashLedgerRow[] = [];

  for (const entry of counted) {
    const amount = cents(entry.amount);
    if (options.to && entry.date >= options.to) {
      continue;
    }
    if (options.from && entry.date < options.from) {
      balance = balance.add(amount);
      broughtForward = balance;
      continue;
    }
    balance = balance.add(amount);
    if (options.kinds?.length && !options.kinds.includes(entry.kind)) continue;
    const moneyIn = amount.gt(0) ? amount : money(0);
    const moneyOut = amount.lt(0) ? amount.neg() : money(0);
    totalIn = totalIn.add(moneyIn);
    totalOut = totalOut.add(moneyOut);
    rows.push({ ...entry, amount, moneyIn, moneyOut, balance: cents(balance) });
  }

  const availableBalance = counted.reduce((sum, entry) => sum.add(cents(entry.amount)), opening);

  return {
    broughtForward: cents(broughtForward),
    rows,
    totalIn: cents(totalIn),
    totalOut: cents(totalOut),
    closingBalance: cents(balance),
    availableBalance: cents(availableBalance),
  };
}

const KINDS = Object.keys(CASH_LEDGER_KIND_LABEL) as CashLedgerKind[];

function parseDay(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD&kind=... — `to` is inclusive for the user, exclusive internally. */
export function parseCashLedgerParams(params: Record<string, string | undefined>) {
  const fromValue = parseDay(params.from) ? params.from! : "";
  const toValue = parseDay(params.to) ? params.to! : "";
  const toDay = parseDay(toValue);
  const kind = KINDS.includes(params.kind as CashLedgerKind) ? (params.kind as CashLedgerKind) : null;
  return {
    fromValue,
    toValue,
    kind,
    from: parseDay(fromValue),
    to: toDay ? new Date(toDay.getTime() + 24 * 60 * 60 * 1000) : null,
  };
}
