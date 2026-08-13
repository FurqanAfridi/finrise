import { OPEN_BUYER_STATUSES } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION, notifyReviewers } from "@/lib/notifications";

export async function notifyMonthStart(tenantId: string) {
  const now = new Date();
  if (now.getUTCDate() !== 1) return;
  const key = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
  const existing = await prisma.notification.findFirst({
    where: {
      tenantId,
      type: NOTIFICATION.MONTHLY_OVERVIEW,
      body: { contains: key },
    },
  });
  if (existing) return;
  await notifyReviewers({
    tenantId,
    type: NOTIFICATION.MONTHLY_OVERVIEW,
    title: "Monthly overview is ready",
    body: `Live report for ${key} is available.`,
    href: `/reports/monthly/${now.getUTCFullYear()}/${now.getUTCMonth() + 1}`,
  });
}

export async function notifyOverdueInvoices(tenantId: string) {
  const overdue = await prisma.buyerInvoice.findMany({
    where: {
      tenantId,
      paymentStatus: { in: OPEN_BUYER_STATUSES },
      dueDate: { lt: new Date() },
    },
    include: { buyer: true },
    take: 20,
  });
  if (overdue.length === 0) return;
  const existing = await prisma.notification.findFirst({
    where: {
      tenantId,
      type: NOTIFICATION.OVERDUE_INVOICE,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (existing) return;
  await notifyReviewers({
    tenantId,
    type: NOTIFICATION.OVERDUE_INVOICE,
    title: `${overdue.length} overdue buyer invoice${overdue.length === 1 ? "" : "s"}`,
    body: overdue
      .slice(0, 5)
      .map((row) => `${row.buyer.name} ${row.invoiceNumber ?? row.id}`)
      .join(", "),
    href: "/buyers",
  });
}
