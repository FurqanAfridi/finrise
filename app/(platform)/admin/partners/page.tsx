import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import { PartnerTier } from "@prisma/client";
import { platformDeletePartner, platformUpdatePartner } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

const PAGE_SIZE = 40;

export default async function PlatformPartnersPage({
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
      q ? { name: { contains: q, mode: "insensitive" as const } } : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.partner.findMany({
      where,
      include: { tenant: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.partner.count({ where }),
  ]);
  const editing =
    editId ? rows.find((r) => r.id === editId) ?? (await prisma.partner.findUnique({ where: { id: editId } })) : null;

  return (
    <>
      <PageHeader title="Partners" description="Profit-share and top-line partners across companies." />
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
            await platformUpdatePartner(fd);
          }}
          spacing={1.5}
          sx={{ mb: 3, p: 2, border: 1, borderColor: "divider", borderRadius: 2, maxWidth: 560, bgcolor: "background.paper" }}
        >
          <input type="hidden" name="id" value={editing.id} />
          <TextField name="name" label="Name" defaultValue={editing.name} required fullWidth size="small" />
          <TextField name="tier" label="Tier" select defaultValue={editing.tier} fullWidth size="small">
            {Object.values(PartnerTier).map((tier) => (
              <MenuItem key={tier} value={tier}>
                {tier}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            name="sharePercent"
            label="Share %"
            defaultValue={String(num(editing.sharePercent))}
            fullWidth
            size="small"
          />
          <FormControlLabel control={<Checkbox name="isActive" defaultChecked={editing.isActive} />} label="Active" />
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained">
              Save partner
            </Button>
            <form
              action={async (fd) => {
                "use server";
                await platformDeletePartner(fd);
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
            <TableCell>Tier</TableCell>
            <TableCell align="right">Share %</TableCell>
            <TableCell>Active</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.tenant.name}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.tier}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {num(row.sharePercent)}
              </TableCell>
              <TableCell>{row.isActive ? "Yes" : "No"}</TableCell>
              <TableCell align="right">
                <Button
                  href={`/admin/partners?edit=${row.id}${tenantId ? `&tenant=${tenantId}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  size="small"
                >
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
        basePath="/admin/partners"
        query={{ q, tenant: tenantId ?? "" }}
      />
    </>
  );
}
