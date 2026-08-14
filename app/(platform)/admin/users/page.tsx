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
import { platformInviteAdmin } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 40;

export default async function PlatformUsersPage({
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
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account on the platform. Platform admins can manage all companies; invite more admins below (no public signup)."
      />

      <Box
        component="form"
        action={async (fd) => {
          "use server";
          await platformInviteAdmin({}, fd);
        }}
        sx={{ mb: 3, p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Invite a platform admin
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField name="email" type="email" label="Email" required fullWidth size="small" />
          <Button type="submit" variant="contained" sx={{ flexShrink: 0 }}>
            Send invite
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          They join under you as a platform admin. If email isn’t configured, check Invites for the shareable link.
        </Typography>
      </Box>

      <Box component="form" sx={{ mb: 2, display: "flex", gap: 1 }}>
        <TextField name="q" defaultValue={q} label="Search" size="small" />
        <Button type="submit" variant="outlined" color="secondary">
          Search
        </Button>
      </Box>

      <Table size="small" sx={{ bgcolor: "background.paper" }}>
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Platform role</TableCell>
            <TableCell>Companies</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.name ?? "—"}</TableCell>
              <TableCell>{row.role}</TableCell>
              <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{row._count.memberships}</TableCell>
              <TableCell>{row.createdAt.toISOString().slice(0, 10)}</TableCell>
              <TableCell align="right">
                <Button href={`/admin/users/${row.id}`} size="small">
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Typography variant="body2" color="text.secondary">
                  No users match this search.
                </Typography>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/users"
        query={{ q }}
      />
    </>
  );
}
