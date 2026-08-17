import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { DailyFiguresHub } from "@/components/directory/daily-figures-hub";
import { FilterBar } from "@/components/shared/filter-bar";
import { NativeSelect, TextInput } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { generateCycleDraftsAction } from "@/app/actions/daily-figures";
import { addUtcDays, utcDay } from "@/lib/billing-cycle";
import { displayDate, isoDate } from "@/lib/dates";
import { listDailyFigureLog } from "@/lib/daily-figures";
import { formatMoney } from "@/lib/money";
import { getDirectoryOptions } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";
import { parseFormDate } from "@/lib/validation";

const MAX_RANGE_DAYS = 366;

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() || "";
}

function parseKind(raw: string | string[] | undefined): "buyer" | "publisher" {
  return first(raw) === "publishers" ? "publisher" : "buyer";
}

function parseStatus(raw: string | string[] | undefined): "invoiced" | "unbilled" | undefined {
  const value = first(raw);
  return value === "invoiced" || value === "unbilled" ? value : undefined;
}

function daysInclusive(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export default async function DailyFiguresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireBrokerOps();
  const params = await searchParams;
  const kind = parseKind(params.tab);
  const contactId = first(params.contact) || undefined;
  const verticalId = first(params.vertical) || undefined;
  const status = parseStatus(params.status);
  const today = utcDay(new Date());
  const defaultFrom = addUtcDays(today, -13);
  const fromParsed = parseFormDate(first(params.from), "From", false);
  const toParsed = parseFormDate(first(params.to), "To", false);
  const from = fromParsed.ok && fromParsed.value ? fromParsed.value : defaultFrom;
  const to = toParsed.ok && toParsed.value ? toParsed.value : today;
  let rangeStart = from <= to ? from : to;
  const rangeEnd = from <= to ? to : from;
  if (daysInclusive(rangeStart, rangeEnd) > MAX_RANGE_DAYS) {
    rangeStart = addUtcDays(rangeEnd, -(MAX_RANGE_DAYS - 1));
  }
  const fromValue = isoDate(rangeStart);
  const toValue = isoDate(rangeEnd);
  const tab = kind === "publisher" ? "publishers" : "buyers";
  const defaultRange = fromValue === isoDate(defaultFrom) && toValue === isoDate(today);

  const [{ buyers, publishers, verticals }, log] = await Promise.all([
    getDirectoryOptions(ctx.tenantId),
    listDailyFigureLog(ctx.tenantId, kind, {
      from: rangeStart,
      to: rangeEnd,
      contactId,
      verticalId,
      status,
    }),
  ]);

  const contacts = kind === "publisher" ? publishers : buyers;
  const selectedContact = contacts.find((row) => row.id === contactId);
  const query: Record<string, string> = { tab, from: fromValue, to: toValue };
  if (contactId) query.contact = contactId;
  if (verticalId) query.vertical = verticalId;
  if (status) query.status = status;

  const tabQuery = new URLSearchParams({ from: fromValue, to: toValue });
  if (verticalId) tabQuery.set("vertical", verticalId);
  if (status) tabQuery.set("status", status);

  const chips = [
    contactId
      ? {
          key: "contact",
          label: `${kind === "buyer" ? "Buyer" : "Publisher"}: ${selectedContact?.name ?? "Selected"}`,
        }
      : null,
    verticalId
      ? { key: "vertical", label: `Vertical: ${verticals.find((row) => row.id === verticalId)?.name ?? "Selected"}` }
      : null,
    status
      ? { key: "status", label: status === "invoiced" ? "Status: On invoice" : "Status: Not invoiced" }
      : null,
    !defaultRange ? { key: "from", label: `Dates: ${displayDate(rangeStart)} to ${displayDate(rangeEnd)}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  const count = log.entries.length;
  const moneyLabel = kind === "buyer" ? "to collect" : "to pay";

  return (
    <Box>
      <PageHeader
        title="Daily figures"
        description={
          count === 0
            ? "Filter by contact, vertical, date, or invoice status. You can still add a missed past date."
            : `${count} ${count === 1 ? "entry" : "entries"} · ${log.totalQuantity} calls / leads · ${formatMoney(log.totalAmount)} ${moneyLabel}`
        }
      >
        <Box component="form" action={generateCycleDraftsAction}>
          <Button type="submit" variant="outlined" color="primary" sx={{ minHeight: 44 }}>
            Prepare due drafts
          </Button>
        </Box>
      </PageHeader>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 3, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Link href={`/figures?tab=buyers&${tabQuery.toString()}`}>
          <Button
            variant="text"
            sx={{
              minHeight: 44,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: kind === "buyer" ? 600 : 500,
              color: kind === "buyer" ? "text.primary" : "text.secondary",
              bgcolor: kind === "buyer" ? "action.hover" : "transparent",
            }}
          >
            Buyers
          </Button>
        </Link>
        <Link href={`/figures?tab=publishers&${tabQuery.toString()}`}>
          <Button
            variant="text"
            sx={{
              minHeight: 44,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: kind === "publisher" ? 600 : 500,
              color: kind === "publisher" ? "text.primary" : "text.secondary",
              bgcolor: kind === "publisher" ? "action.hover" : "transparent",
            }}
          >
            Publishers
          </Button>
        </Link>
      </Box>

      <FilterBar basePath="/figures" query={query} chips={chips}>
        <Box>
          <input type="hidden" name="tab" value={tab} />
          <NativeSelect name="contact" label={kind === "buyer" ? "Buyer" : "Publisher"} defaultValue={contactId ?? ""}>
            <option value="">{kind === "buyer" ? "All buyers" : "All publishers"}</option>
            {log.contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </NativeSelect>
        </Box>
        <NativeSelect name="vertical" label="Vertical" defaultValue={verticalId ?? ""}>
          <option value="">All verticals</option>
          {verticals.map((vertical) => (
            <option key={vertical.id} value={vertical.id}>
              {vertical.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" label="Invoice status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          <option value="unbilled">Not invoiced</option>
          <option value="invoiced">On invoice</option>
        </NativeSelect>
        <TextInput name="from" label="From" type="date" defaultValue={fromValue} />
        <TextInput name="to" label="To" type="date" defaultValue={toValue} />
      </FilterBar>

      <DailyFiguresHub
        entries={log.entries}
        contacts={log.contacts}
        kind={kind}
        moneyLabel={moneyLabel}
      />
    </Box>
  );
}
