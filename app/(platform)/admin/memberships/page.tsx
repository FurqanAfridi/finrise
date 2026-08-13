import Link from "next/link";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import { TenantRole } from "@prisma/client";
import { platformDeleteMembership, platformUpsertMembership } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { TENANT_ROLE_LABEL } from "@/lib/status";

const PAGE_SIZE = 50;

export default async function PlatformMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const tenantId = params.tenant?.trim() || undefined;
  const where = tenantId ? { tenantId } : {};

  const [rows, total, users, tenants] = await Promise.all([
    prisma.tenantMembership.findMany({
      where,
      include: { user: true, tenant: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.tenantMembership.count({ where }),
    prisma.user.findMany({ orderBy: { email: "asc" }, select: { id: true, email: true }, take: 500 }),
    prisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Memberships" description="Links between users and companies, including portal roles." />

      <Stack
        component="form"
        action={async (fd) => {
          "use server";
          await platformUpsertMembership(fd);
        }}
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ mb: 3, p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
      >
        <TextField name="userId" label="User" select required size="small" sx={{ minWidth: 220 }} defaultValue="">
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.email}
            </MenuItem>
          ))}
        </TextField>
        <TextField name="tenantId" label="Company" select required size="small" sx={{ minWidth: 200 }} defaultValue={tenantId ?? ""}>
          {tenants.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField name="role" label="Role" select size="small" defaultValue={TenantRole.BROKER} sx={{ minWidth: 160 }}>
          {Object.values(TenantRole).map((role) => (
            <MenuItem key={role} value={role}>
              {TENANT_ROLE_LABEL[role] ?? role}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained">
          Add
        </Button>
      </Stack>

      <Table size="small" sx={{ bgcolor: "background.paper" }}>
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Company</TableCell>
            <TableCell>Role</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>
                <Button component={Link} href={`/admin/users/${row.userId}`} size="small">
                  {row.user.email}
                </Button>
              </TableCell>
              <TableCell>
                <Button component={Link} href={`/admin/tenants/${row.tenantId}`} size="small">
                  {row.tenant.name}
                </Button>
              </TableCell>
              <TableCell>{TENANT_ROLE_LABEL[row.role] ?? row.role}</TableCell>
              <TableCell align="right">
                <form
                  action={async (fd) => {
                    "use server";
                    await platformDeleteMembership(fd);
                  }}
                >
                  <input type="hidden" name="id" value={row.id} />
                  <Button type="submit" size="small" color="error">
                    Remove
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/memberships"
        query={{ tenant: tenantId ?? "" }}
      />
    </>
  );
}
