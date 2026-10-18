import Link from "next/link";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { InvoiceActivityAction, type Prisma } from "@prisma/client";
import { MainCard } from "@/components/berry/main-card";
import { NativeSelect, TextInput } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { LocalTime } from "@/components/shared/local-time";
import { displayDate } from "@/lib/dates";
import { ACTIVITY_ACTION_LABEL } from "@/lib/invoice-audit";
import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/tenant";

const PAGE_SIZE = 50;
const ACTIONS = Object.values(InvoiceActivityAction);

function parseDay(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Everything staff did to invoices and payables: who, what, when. Company admins only. */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireTenantAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const userId = params.user || null;
  const action = ACTIONS.includes(params.action as InvoiceActivityAction) ? (params.action as InvoiceActivityAction) : null;
  const invoiceId = params.invoice || null;
  const from = parseDay(params.from);
  const toDay = parseDay(params.to);
  const to = toDay ? new Date(toDay.getTime() + 24 * 60 * 60 * 1000) : null;

  const where: Prisma.InvoiceActivityWhereInput = {
    tenantId: ctx.tenantId,
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(invoiceId ? { invoiceId } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
  };

  const [rows, total, members] = await Promise.all([
    prisma.invoiceActivity.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invoiceActivity.count({ where }),
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId, role: { in: ["ADMIN", "BROKER", "ACCOUNTANT"] } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const deleted = await prisma.invoiceActivity.findMany({
    where: { tenantId: ctx.tenantId, action: "DELETED", invoiceId: { in: rows.map((row) => row.invoiceId) } },
    select: { invoiceId: true },
  });
  const deletedIds = new Set(deleted.map((row) => row.invoiceId));
  const query: Record<string, string> = {};
  for (const key of ["user", "action", "invoice", "from", "to"] as const) {
    if (params[key]) query[key] = params[key] as string;
  }
  const memberName = (id: string) => {
    const member = members.find((row) => row.user.id === id)?.user;
    return member ? member.name || member.email : "Selected person";
  };
  const chips = [
    userId ? { key: "user", label: `Person: ${memberName(userId)}` } : null,
    action ? { key: "action", label: `Action: ${ACTIVITY_ACTION_LABEL[action]}` } : null,
    invoiceId ? { key: "invoice", label: `Bill: ${rows[0]?.invoiceLabel ?? "Selected"}` } : null,
    from ? { key: "from", label: `From ${displayDate(from)}` } : null,
    toDay ? { key: "to", label: `To ${displayDate(toDay)}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <Box>
      <PageHeader
        title="Activity"
        description={`Who created, changed, paid, approved, sent, or deleted each invoice and payable. ${total} ${total === 1 ? "entry" : "entries"}.`}
      />

      <FilterBar basePath="/activity" query={query} chips={chips}>
        <NativeSelect label="Person" name="user" defaultValue={userId ?? ""}>
          <option value="">Everyone</option>
          {members.map((row) => (
            <option key={row.user.id} value={row.user.id}>
              {row.user.name || row.user.email}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect label="Action" name="action" defaultValue={action ?? ""}>
          <option value="">All actions</option>
          {ACTIONS.map((value) => (
            <option key={value} value={value}>
              {ACTIVITY_ACTION_LABEL[value]}
            </option>
          ))}
        </NativeSelect>
        <TextInput label="From" name="from" type="date" defaultValue={params.from ?? ""} />
        <TextInput label="To" name="to" type="date" defaultValue={params.to ?? ""} />
        {invoiceId ? <input type="hidden" name="invoice" value={invoiceId} /> : null}
      </FilterBar>

      <MainCard content={false} title="History">
        {rows.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Actions on invoices and payables show up here from now on: created, edited, marked paid, approved, sent, and deleted."
          />
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Who</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Bill</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const href = deletedIds.has(row.invoiceId)
                    ? null
                    : row.kind === "buyer"
                      ? `/buyers/${row.invoiceId}`
                      : `/publishers/${row.invoiceId}`;
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <LocalTime iso={row.createdAt.toISOString()} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                        {row.user ? row.user.name || row.user.email : "Removed user"}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{ACTIVITY_ACTION_LABEL[row.action]}</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        {href ? (
                          <Link href={href} style={{ color: "inherit" }}>
                            {row.invoiceLabel}
                          </Link>
                        ) : (
                          row.invoiceLabel
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {row.kind === "buyer" ? "Invoice" : "Payable"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", minWidth: 220 }}>{row.details ?? ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MainCard>

      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))} basePath="/activity" query={query} />
    </Box>
  );
}
