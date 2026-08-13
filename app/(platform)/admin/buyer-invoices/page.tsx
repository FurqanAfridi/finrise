import Link from "next/link";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusPill } from "@/components/shared/status-pill";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

const PAGE_SIZE = 40;

export default async function PlatformBuyerInvoicesPage({
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
              { buyer: { name: { contains: q, mode: "insensitive" as const } } },
              { tenant: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.buyerInvoice.findMany({
      where,
      include: { buyer: true, tenant: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.buyerInvoice.count({ where }),
  ]);

  return (
    <>
      <PageHeader title="Buyer invoices" description="Receivables across every company." />
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
            <TableCell>Buyer</TableCell>
            <TableCell>Invoice</TableCell>
            <TableCell align="right">Receivable</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.tenant.name}</TableCell>
              <TableCell>{row.buyer.name}</TableCell>
              <TableCell>{row.invoiceNumber || row.periodLabel || "—"}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {formatMoney(num(row.receivable))}
              </TableCell>
              <TableCell>
                <StatusPill paymentStatus={row.paymentStatus} />
              </TableCell>
              <TableCell align="right">
                <Button component={Link} href={`/admin/buyer-invoices/${row.id}`} size="small">
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
        basePath="/admin/buyer-invoices"
        query={{ q, tenant: tenantId ?? "" }}
      />
    </>
  );
}
