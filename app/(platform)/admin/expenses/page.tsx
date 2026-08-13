import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import { platformDeleteExpense, platformUpdateExpense } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

const PAGE_SIZE = 40;

export default async function PlatformExpensesPage({
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
              { category: { contains: q, mode: "insensitive" as const } },
              { label: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { tenant: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.expense.count({ where }),
  ]);
  const editing =
    editId ? rows.find((r) => r.id === editId) ?? (await prisma.expense.findUnique({ where: { id: editId } })) : null;

  return (
    <>
      <PageHeader title="Expenses" description="Expense rows from every company." />
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
            await platformUpdateExpense(fd);
          }}
          spacing={1.5}
          sx={{ mb: 3, p: 2, border: 1, borderColor: "divider", borderRadius: 2, maxWidth: 560, bgcolor: "background.paper" }}
        >
          <input type="hidden" name="id" value={editing.id} />
          <TextField name="category" label="Category" defaultValue={editing.category} fullWidth size="small" />
          <TextField name="label" label="Label" defaultValue={editing.label ?? ""} fullWidth size="small" />
          <TextField name="year" label="Year" defaultValue={String(editing.year)} fullWidth size="small" />
          <TextField name="month" label="Month" defaultValue={String(editing.month)} fullWidth size="small" />
          <TextField name="paid" label="Paid" defaultValue={String(num(editing.paid))} fullWidth size="small" />
          <TextField name="actual" label="Actual" defaultValue={String(num(editing.actual))} fullWidth size="small" />
          <TextField name="method" label="Method" defaultValue={editing.method ?? ""} fullWidth size="small" />
          <TextField name="notes" label="Notes" defaultValue={editing.notes ?? ""} fullWidth size="small" />
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained">
              Save expense
            </Button>
            <form
              action={async (fd) => {
                "use server";
                await platformDeleteExpense(fd);
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
            <TableCell>Period</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Label</TableCell>
            <TableCell align="right">Actual</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.tenant.name}</TableCell>
              <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                {row.year}-{String(row.month).padStart(2, "0")}
              </TableCell>
              <TableCell>{row.category}</TableCell>
              <TableCell>{row.label ?? "—"}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {formatMoney(num(row.actual))}
              </TableCell>
              <TableCell align="right">
                <Button
                  href={`/admin/expenses?edit=${row.id}${tenantId ? `&tenant=${tenantId}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
        basePath="/admin/expenses"
        query={{ q, tenant: tenantId ?? "" }}
      />
    </>
  );
}
