import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  deleteExpense,
  deleteRecurringExpense,
  generateRecurringForMonth,
  upsertExpense,
  upsertRecurringExpense,
} from "@/app/actions/ops";
import { MainCard } from "@/components/berry/main-card";
import { DayOfMonthSelect, MonthSelect, NativeSelect, TextInput, YearSelect } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusPill } from "@/components/shared/status-pill";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireBrokerOps } from "@/lib/tenant";
import { monthName, num } from "@/lib/utils";
import { gridSpacing } from "@/theme/berry";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireBrokerOps();
  const params = await searchParams;
  const now = new Date();
  const year = Number(first(params.year) ?? now.getUTCFullYear());
  const monthRaw = first(params.month);
  const month = monthRaw === "all" || !monthRaw ? null : Number(monthRaw);
  const categoryFilter = first(params.category) || "";
  const editId = first(params.edit) || "";
  const showInactive = first(params.templates) === "all";

  const where = {
    tenantId: ctx.tenantId,
    year: Number.isFinite(year) ? year : now.getUTCFullYear(),
    ...(month && Number.isFinite(month) ? { month } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
  };

  const [expenses, recurring, categories, editRow, totals] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { categoryRel: true },
      orderBy: [{ year: "desc" }, { month: "desc" }, { category: "asc" }],
      take: 200,
    }),
    prisma.recurringExpense.findMany({
      where: { tenantId: ctx.tenantId, ...(showInactive ? {} : { isActive: true }) },
      include: { category: true },
      orderBy: [{ isActive: "desc" }, { label: "asc" }],
    }),
    prisma.expenseCategory.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
    }),
    editId
      ? prisma.expense.findFirst({ where: { id: editId, tenantId: ctx.tenantId } })
      : Promise.resolve(null),
    prisma.expense.aggregate({
      where,
      _sum: { actual: true, paid: true },
      _count: true,
    }),
  ]);

  const actualTotal = num(totals._sum.actual);
  const paidTotal = num(totals._sum.paid);
  const formDefaults = editRow
    ? {
        id: editRow.id,
        year: editRow.year,
        month: editRow.month,
        category: editRow.category,
        label: editRow.label ?? "",
        actual: String(num(editRow.actual)),
        paid: String(num(editRow.paid)),
        method: editRow.method ?? "",
        notes: editRow.notes ?? "",
      }
    : {
        id: "",
        year,
        month: month ?? now.getUTCMonth() + 1,
        category: categoryFilter,
        label: "",
        actual: "",
        paid: "",
        method: "",
        notes: "",
      };

  return (
    <Box>
      <PageHeader
        title="Expenses"
        description="Track monthly costs, edit past rows, and generate from recurring templates."
      />

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Booked"
            value={formatMoney(actualTotal)}
            subtitle={`${totals._count} expense${totals._count === 1 ? "" : "s"} in this view`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Paid"
            value={formatMoney(paidTotal)}
            subtitle="Cash already paid for these expenses"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Unpaid gap"
            value={formatMoney(Math.max(actualTotal - paidTotal, 0))}
            subtitle="Booked amount still unpaid"
          />
        </Grid>
      </Grid>

      <MainCard sx={{ mb: 3 }} contentSX={{ py: 2 }}>
        <Box
          component="form"
          method="get"
          sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <Box sx={{ minWidth: 120, flex: "1 1 120px" }}>
            <YearSelect name="year" required defaultValue={year} />
          </Box>
          <Box sx={{ minWidth: 140, flex: "1 1 140px" }}>
            <MonthSelect name="month" allowEmpty emptyLabel="All months" defaultValue={month ?? ""} />
          </Box>
          <Box sx={{ minWidth: 180, flex: "1 1 180px" }}>
            <NativeSelect label="Category" name="category" defaultValue={categoryFilter}>
              <option value="">All categories</option>
              {categories.map((row) => (
                <option key={row.id} value={row.name}>
                  {row.name}
                </option>
              ))}
            </NativeSelect>
          </Box>
          <Button type="submit" variant="contained" color="primary">
            Apply filters
          </Button>
          <Link href="/expenses">
            <Button type="button" variant="outlined" color="primary">
              Clear
            </Button>
          </Link>
        </Box>
      </MainCard>

      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <MainCard
            title={editRow ? "Edit expense" : "Add expense"}
            contentSX={{ display: "grid", gap: 2, gridTemplateColumns: { md: "repeat(3, 1fr)" } }}
          >
            <Box component="form" action={upsertExpense} sx={{ display: "contents" }}>
              {formDefaults.id ? <input type="hidden" name="id" value={formDefaults.id} /> : null}
              <YearSelect name="year" required defaultValue={formDefaults.year} />
              <MonthSelect name="month" required defaultValue={formDefaults.month} />
              <TextInput
                label="Category"
                name="category"
                required
                defaultValue={formDefaults.category}
                maxLength={80}
                helperText={categories.length ? `Suggestions: ${categories.slice(0, 4).map((c) => c.name).join(", ")}` : undefined}
              />
              <TextInput label="Label" name="label" defaultValue={formDefaults.label} maxLength={120} />
              <TextInput label="Actual" name="actual" kind="decimal" maxDecimals={2} min={0} defaultValue={formDefaults.actual} />
              <TextInput label="Paid" name="paid" kind="decimal" maxDecimals={2} min={0} defaultValue={formDefaults.paid} />
              <TextInput label="Method" name="method" maxLength={80} defaultValue={formDefaults.method} />
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <TextInput label="Notes" name="notes" maxLength={240} defaultValue={formDefaults.notes} />
              </Box>
              <Stack direction="row" spacing={1} sx={{ gridColumn: { md: "1 / -1" } }}>
                <Button type="submit" variant="contained" color="secondary">
                  {editRow ? "Save changes" : "Add expense"}
                </Button>
                {editRow ? (
                  <Link href={`/expenses?year=${year}${month ? `&month=${month}` : ""}`}>
                    <Button type="button" variant="outlined">
                      Cancel edit
                    </Button>
                  </Link>
                ) : null}
              </Stack>
            </Box>
          </MainCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <MainCard title="Recurring templates" contentSX={{ display: "grid", gap: 2 }}>
            <Box component="form" action={upsertRecurringExpense} sx={{ display: "grid", gap: 2 }}>
              {categories.length > 0 ? (
                <NativeSelect label="Category" name="category" required>
                  <option value="">Select category</option>
                  {categories.map((row) => (
                    <option key={row.id} value={row.name}>
                      {row.name}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <TextInput label="Category" name="category" required maxLength={80} />
              )}
              <TextInput label="Label" name="label" required maxLength={120} />
              <TextInput label="Amount" name="amount" required kind="decimal" maxDecimals={2} min={0} />
              <DayOfMonthSelect name="dayOfMonth" defaultValue={1} required />
              <Button type="submit" variant="contained" color="secondary">
                Save template
              </Button>
            </Box>
            <Box component="form" action={generateRecurringForMonth} sx={{ display: "grid", gap: 2 }}>
              <YearSelect name="year" required defaultValue={year} />
              <MonthSelect name="month" required defaultValue={month ?? now.getUTCMonth() + 1} />
              <Button type="submit" variant="outlined">
                Generate this month
              </Button>
            </Box>
          </MainCard>
        </Grid>
      </Grid>

      <MainCard
        content={false}
        title="Templates"
        secondary={
          <Link href={showInactive ? "/expenses" : "/expenses?templates=all"}>
            <Button size="small" variant="text">
              {showInactive ? "Hide inactive" : "Show inactive"}
            </Button>
          </Link>
        }
        sx={{ mb: 3 }}
      >
        {recurring.length === 0 ? (
          <Box sx={{ px: 2.5, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No recurring templates yet. Save one above to auto-create monthly rows.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Label</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Day</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recurring.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{row.category.name}</TableCell>
                    <TableCell align="right" className="fr-money">
                      {formatMoney(num(row.amount))}
                    </TableCell>
                    <TableCell>{row.dayOfMonth}</TableCell>
                    <TableCell>
                      <StatusPill kind={row.isActive ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <Box component="form" action={upsertRecurringExpense}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="category" value={row.category.name} />
                          <input type="hidden" name="label" value={row.label} />
                          <input type="hidden" name="amount" value={String(num(row.amount))} />
                          <input type="hidden" name="dayOfMonth" value={row.dayOfMonth} />
                          <input type="hidden" name="isActive" value={row.isActive ? "false" : "true"} />
                          <Button type="submit" size="small" variant="outlined">
                            {row.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </Box>
                        <Box component="form" action={deleteRecurringExpense}>
                          <input type="hidden" name="id" value={row.id} />
                          <Button type="submit" size="small" color="error" variant="text">
                            Delete
                          </Button>
                        </Box>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MainCard>

      <MainCard content={false} title="Expense history">
        {expenses.length === 0 ? (
          <EmptyState
            title="No expenses in this view"
            description="Try another month, or add an expense above. You can also upload historical expenses in Settings → Import."
            actionHref="/settings?tab=import"
            actionLabel="Upload history"
          />
        ) : (
          <>
            <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell align="right">Actual</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((row) => (
                    <TableRow key={row.id} hover selected={row.id === editId}>
                      <TableCell>
                        {monthName(row.month)} {row.year}
                      </TableCell>
                      <TableCell>{row.categoryRel?.name ?? row.category}</TableCell>
                      <TableCell>{row.label ?? "—"}</TableCell>
                      <TableCell align="right" className="fr-money">
                        {formatMoney(num(row.actual))}
                      </TableCell>
                      <TableCell align="right" className="fr-money">
                        {formatMoney(num(row.paid))}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                          <Link
                            href={`/expenses?year=${row.year}&month=${row.month}&edit=${row.id}${
                              categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : ""
                            }`}
                          >
                            <Button size="small" variant="outlined">
                              Edit
                            </Button>
                          </Link>
                          <Box component="form" action={deleteExpense}>
                            <input type="hidden" name="id" value={row.id} />
                            <Button type="submit" color="error" size="small">
                              Delete
                            </Button>
                          </Box>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" }, p: 2 }}>
              {expenses.map((row) => (
                <Box
                  key={row.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    {row.label ?? row.categoryRel?.name ?? row.category}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {monthName(row.month)} {row.year} · {row.categoryRel?.name ?? row.category}
                  </Typography>
                  <Stack direction="row" sx={{ mt: 1, justifyContent: "space-between" }}>
                    <Typography variant="body2" className="fr-money">
                      Actual {formatMoney(num(row.actual))}
                    </Typography>
                    <Typography variant="body2" className="fr-money">
                      Paid {formatMoney(num(row.paid))}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                    <Link href={`/expenses?year=${row.year}&month=${row.month}&edit=${row.id}`}>
                      <Button size="small" variant="outlined">
                        Edit
                      </Button>
                    </Link>
                    <Box component="form" action={deleteExpense}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" color="error" size="small">
                        Delete
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </MainCard>
    </Box>
  );
}
