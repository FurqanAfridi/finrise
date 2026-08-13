import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { deleteExpense, generateRecurringForMonth, upsertExpense, upsertRecurringExpense } from "@/app/actions/ops";
import { MainCard } from "@/components/berry/main-card";
import { TextInput } from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireBrokerOps } from "@/lib/tenant";
import { monthName, num } from "@/lib/utils";
import { gridSpacing } from "@/theme/berry";

export default async function ExpensesPage() {
  const ctx = await requireBrokerOps();
  const now = new Date();
  const [expenses, recurring] = await Promise.all([
    prisma.expense.findMany({
      where: { tenantId: ctx.tenantId },
      include: { categoryRel: true },
      orderBy: [{ year: "desc" }, { month: "desc" }, { category: "asc" }],
    }),
    prisma.recurringExpense.findMany({
      where: { tenantId: ctx.tenantId },
      include: { category: true },
      orderBy: { label: "asc" },
    }),
  ]);

  return (
    <Box>
      <PageHeader title="Expenses" description="Recurring templates generate a monthly Actual vs Paid row." />
      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <MainCard title="Add expense" contentSX={{ display: "grid", gap: 2, gridTemplateColumns: { md: "repeat(3, 1fr)" } }}>
            <Box component="form" action={upsertExpense} sx={{ display: "contents" }}>
              <TextInput label="Year" name="year" required defaultValue={now.getUTCFullYear()} kind="int" min={1990} max={2100} />
              <TextInput label="Month" name="month" required defaultValue={now.getUTCMonth() + 1} kind="int" min={1} max={12} />
              <TextInput label="Category" name="category" required maxLength={80} />
              <TextInput label="Label" name="label" maxLength={120} />
              <TextInput label="Actual" name="actual" kind="decimal" maxDecimals={2} min={0} />
              <TextInput label="Paid" name="paid" kind="decimal" maxDecimals={2} min={0} />
              <TextInput label="Method" name="method" maxLength={80} />
              <Button type="submit" variant="contained" color="secondary">
                Add expense
              </Button>
            </Box>
          </MainCard>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <MainCard title="Recurring template" contentSX={{ display: "grid", gap: 2 }}>
            <Box component="form" action={upsertRecurringExpense} sx={{ display: "grid", gap: 2 }}>
              <TextInput label="Category" name="category" required maxLength={80} />
              <TextInput label="Label" name="label" required maxLength={120} />
              <TextInput label="Amount" name="amount" required kind="decimal" maxDecimals={2} min={0} />
              <TextInput label="Day of month" name="dayOfMonth" defaultValue={1} kind="int" min={1} max={28} />
              <Button type="submit" variant="contained" color="secondary">
                Save template
              </Button>
            </Box>
            <Box component="form" action={generateRecurringForMonth} sx={{ display: "grid", gap: 2, mt: 2 }}>
              <TextInput label="Year" name="year" required defaultValue={now.getUTCFullYear()} kind="int" min={1990} max={2100} />
              <TextInput label="Month" name="month" required defaultValue={now.getUTCMonth() + 1} kind="int" min={1} max={12} />
              <Button type="submit" variant="outlined">
                Generate this month
              </Button>
            </Box>
          </MainCard>
        </Grid>
      </Grid>

      <MainCard content={false} title="Active templates" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Label</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Day</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recurring.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.category.name}</TableCell>
                <TableCell>{money(num(row.amount))}</TableCell>
                <TableCell>{row.dayOfMonth}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MainCard>

      <MainCard content={false} title="Expense history">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Label</TableCell>
              <TableCell>Actual</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  {monthName(row.month)} {row.year}
                </TableCell>
                <TableCell>{row.categoryRel?.name ?? row.category}</TableCell>
                <TableCell>{row.label ?? "—"}</TableCell>
                <TableCell>{money(num(row.actual))}</TableCell>
                <TableCell>{money(num(row.paid))}</TableCell>
                <TableCell>
                  <Box component="form" action={deleteExpense}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" color="error" size="small">
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MainCard>
    </Box>
  );
}
