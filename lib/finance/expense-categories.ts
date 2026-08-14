import { prisma } from "@/lib/prisma";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Salary",
  "Loan",
  "Purchases",
  "Rent",
  "Utilities",
  "Software",
  "Advertising",
  "Insurance",
  "Travel",
  "Bank fees",
  "Contractors",
  "Office",
  "Other",
] as const;

export async function ensureDefaultExpenseCategories(tenantId: string) {
  await prisma.expenseCategory.createMany({
    data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ tenantId, name })),
    skipDuplicates: true,
  });
}
