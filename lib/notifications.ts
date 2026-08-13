import { TenantRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const NOTIFICATION = {
  OVERDUE_INVOICE: "OVERDUE_INVOICE",
  VARIANCE_FLAGGED: "VARIANCE_FLAGGED",
  MONTHLY_OVERVIEW: "MONTHLY_OVERVIEW",
  WITHDRAWAL: "WITHDRAWAL",
  PUBLISHER_PAID_APPROVAL: "PUBLISHER_PAID_APPROVAL",
  INVOICE_EMAILED: "INVOICE_EMAILED",
} as const;

const REVIEW_ROLES: TenantRole[] = [TenantRole.ADMIN, TenantRole.BROKER, TenantRole.ACCOUNTANT];

export async function notifyUsers(input: {
  tenantId: string;
  userIds: string[];
  type: string;
  title: string;
  body: string;
  href?: string;
}) {
  if (input.userIds.length === 0) return;
  await prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      tenantId: input.tenantId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  });
}

export async function notifyReviewers(input: {
  tenantId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  excludeUserId?: string;
}) {
  const reviewers = await prisma.tenantMembership.findMany({
    where: {
      tenantId: input.tenantId,
      role: { in: REVIEW_ROLES },
      ...(input.excludeUserId ? { userId: { not: input.excludeUserId } } : {}),
    },
    select: { userId: true },
  });
  const userIds = [...new Set(reviewers.map((row) => row.userId))];
  if (userIds.length === 0) {
    const fallback = await prisma.tenantMembership.findMany({
      where: { tenantId: input.tenantId },
      select: { userId: true },
    });
    await notifyUsers({ ...input, userIds: [...new Set(fallback.map((row) => row.userId))] });
    return;
  }
  await notifyUsers({ ...input, userIds });
}
