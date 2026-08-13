import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { platformUpsertTenant } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 40;

export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        _count: {
          select: {
            memberships: true,
            buyers: true,
            publishers: true,
            buyerInvoices: true,
            publisherInvoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.tenant.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Companies" description="Every tenant workspace. Open one to see its users, invoices, and contacts." />

      <Box
        component="form"
        action={async (fd) => {
          "use server";
          await platformUpsertTenant(fd);
        }}
        sx={{ mb: 3, p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Create company
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField name="name" label="Name" required fullWidth size="small" />
          <TextField name="slug" label="Slug (optional)" fullWidth size="small" />
          <Button type="submit" variant="contained" sx={{ flexShrink: 0 }}>
            Create
          </Button>
        </Stack>
      </Box>

      <Box component="form" sx={{ mb: 2 }}>
        <TextField name="q" defaultValue={q} label="Search companies" size="small" />
        <Button type="submit" sx={{ ml: 1 }} variant="outlined" color="secondary">
          Search
        </Button>
      </Box>

      <Table size="small" sx={{ bgcolor: "background.paper" }}>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Slug</TableCell>
            <TableCell>Users</TableCell>
            <TableCell>Buyers</TableCell>
            <TableCell>Publishers</TableCell>
            <TableCell>Invoices</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.slug}</TableCell>
              <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{row._count.memberships}</TableCell>
              <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{row._count.buyers}</TableCell>
              <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{row._count.publishers}</TableCell>
              <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                {row._count.buyerInvoices + row._count.publisherInvoices}
              </TableCell>
              <TableCell align="right">
                <Button component={Link} href={`/admin/tenants/${row.id}`} size="small">
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} pageCount={pageCount} basePath="/admin/tenants" query={{ q }} />
    </>
  );
}
