import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusPill } from "@/components/shared/status-pill";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

const PAGE_SIZE = 40;

export default async function PlatformPublisherInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tenantId = params.tenant?.trim() || undefined;
  const page = Math.max(1, Number(params.page ?? 1));
  const where = {
    AND: [
      tenantId ? { tenantId } : {},
      q
        ? {
            OR: [
              { invoiceNumber: { contains: q, mode: "insensitive" as const } },
              { publisher: { name: { contains: q, mode: "insensitive" as const } } },
              { tenant: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.publisherInvoice.findMany({
      where,
      include: { publisher: true, tenant: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.publisherInvoice.count({ where }),
  ]);

  return (
    <>
      <PageHeader title="Publisher payables" description="Money owed to publishers across every company." />
      <Box component="form" sx={{ mb: 2, display: "flex", gap: 1 }}>
        <TextField name="q" defaultValue={q} label="Search" size="small" />
        {tenantId ? <input type="hidden" name="tenant" value={tenantId} /> : null}
        <Button type="submit" variant="outlined" color="secondary">
          Search
        </Button>
      </Box>
      <Table size="small" sx={{ bgcolor: "background.paper" }}>
        <TableHead>
          <TableRow>
            <TableCell>Company</TableCell>
            <TableCell>Publisher</TableCell>
            <TableCell>Invoice</TableCell>
            <TableCell align="right">Payable</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.tenant.name}</TableCell>
              <TableCell>{row.publisher.name}</TableCell>
              <TableCell>{row.invoiceNumber || row.periodLabel || "None"}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {formatMoney(num(row.payable))}
              </TableCell>
              <TableCell>
                <StatusPill paymentStatus={row.paymentStatus} />
              </TableCell>
              <TableCell align="right">
                <Button href={`/admin/publisher-invoices/${row.id}`} size="small">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/publisher-invoices"
        query={{ q, tenant: tenantId ?? "" }}
      />
    </>
  );
}
