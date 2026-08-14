import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import { platformDeleteBuyer, platformUpdateBuyer } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 40;

export default async function PlatformBuyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tenantId = params.tenant?.trim() || undefined;
  const page = Math.max(1, Number(params.page ?? 1));
  const editId = params.edit?.trim();
  const where = {
    AND: [
      tenantId ? { tenantId } : {},
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.buyer.findMany({
      where,
      include: { tenant: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.buyer.count({ where }),
  ]);
  const editing = editId ? rows.find((r) => r.id === editId) ?? await prisma.buyer.findUnique({ where: { id: editId } }) : null;

  return (
    <>
      <PageHeader title="Buyers" description="Buyer contacts across all companies." />
      <Box component="form" sx={{ mb: 2, display: "flex", gap: 1 }}>
        <TextField name="q" defaultValue={q} label="Search" size="small" />
        {tenantId ? <input type="hidden" name="tenant" value={tenantId} /> : null}
        <Button type="submit" variant="outlined" color="secondary">
          Search
        </Button>
      </Box>

      {editing ? (
        <Stack
          component="form"
          action={async (fd) => {
            "use server";
            await platformUpdateBuyer(fd);
          }}
          spacing={1.5}
          sx={{ mb: 3, p: 2, border: 1, borderColor: "divider", borderRadius: 2, maxWidth: 560, bgcolor: "background.paper" }}
        >
          <input type="hidden" name="id" value={editing.id} />
          <TextField name="name" label="Name" defaultValue={editing.name} required fullWidth size="small" />
          <TextField name="email" label="Email" defaultValue={editing.email ?? ""} fullWidth size="small" />
          <TextField name="contactName" label="Contact name" defaultValue={editing.contactName ?? ""} fullWidth size="small" />
          <TextField name="address" label="Address" defaultValue={editing.address ?? ""} fullWidth size="small" />
          <TextField name="defaultTerms" label="Default terms" defaultValue={editing.defaultTerms ?? ""} fullWidth size="small" />
          <TextField name="defaultMethod" label="Default method" defaultValue={editing.defaultMethod ?? ""} fullWidth size="small" />
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained">
              Save buyer
            </Button>
            <form
              action={async (fd) => {
                "use server";
                await platformDeleteBuyer(fd);
              }}
            >
              <input type="hidden" name="id" value={editing.id} />
              <Button type="submit" color="error" variant="outlined">
                Delete
              </Button>
            </form>
          </Stack>
        </Stack>
      ) : null}

      <Table size="small" sx={{ bgcolor: "background.paper" }}>
        <TableHead>
          <TableRow>
            <TableCell>Company</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Contact</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.tenant.name}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.email ?? "None"}</TableCell>
              <TableCell>{row.contactName ?? "None"}</TableCell>
              <TableCell align="right">
                <Button href={`/admin/buyers?edit=${row.id}${tenantId ? `&tenant=${tenantId}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`} size="small">
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
        basePath="/admin/buyers"
        query={{ q, tenant: tenantId ?? "" }}
      />
    </>
  );
}
