import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role, TenantRole, type TenantRole as TenantRoleValue } from "@/lib/roles";
import { auth } from "@/auth";
import { isPlatformAdminHost, platformAdminPublicUrl } from "@/lib/platform-host";
import { prisma } from "@/lib/prisma";

export const TENANT_COOKIE = "finrise-tenant";

export const SETTINGS_ROLES: TenantRoleValue[] = [TenantRole.ADMIN];
export const APPROVER_ROLES: TenantRoleValue[] = [TenantRole.ADMIN, TenantRole.BROKER, TenantRole.ACCOUNTANT];
export const WRITE_ROLES: TenantRoleValue[] = [TenantRole.ADMIN, TenantRole.BROKER, TenantRole.ACCOUNTANT];
export const BROKER_OPS_ROLES: TenantRoleValue[] = [TenantRole.ADMIN, TenantRole.BROKER, TenantRole.ACCOUNTANT];

export type TenantContext = {
  userId: string;
  email: string | null;
  name: string | null;
  platformRole: "ADMIN" | "MEMBER";
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantRole: TenantRoleValue;
  /** When role is BUYER, invoices are limited to this contact. */
  linkedBuyerId: string | null;
  /** When role is PUBLISHER, payables are limited to this contact. */
  linkedPublisherId: string | null;
  memberships: { tenantId: string; tenantName: string; tenantSlug: string; role: TenantRoleValue }[];
};

export async function requireSessionUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function requireTenant(): Promise<TenantContext> {
  const session = await requireSessionUser();
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: session.user.id },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) {
    if (session.user.role === Role.ADMIN) {
      const host = (await headers()).get("host");
      redirect(isPlatformAdminHost(host) ? "/admin" : `${platformAdminPublicUrl()}/admin`);
    }
    redirect("/no-tenant");
  }

  const jar = await cookies();
  const requested = jar.get(TENANT_COOKIE)?.value;
  const current = memberships.find((row) => row.tenantId === requested) ?? memberships[0];

  const links = await prisma.$queryRaw<{ buyerId: string | null; publisherId: string | null }[]>`
    SELECT "buyerId", "publisherId" FROM "TenantMembership" WHERE id = ${current.id} LIMIT 1
  `;

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    platformRole: session.user.role,
    tenantId: current.tenantId,
    tenantName: current.tenant.name,
    tenantSlug: current.tenant.slug,
    tenantRole: current.role,
    linkedBuyerId: links[0]?.buyerId ?? null,
    linkedPublisherId: links[0]?.publisherId ?? null,
    memberships: memberships.map((row) => ({
      tenantId: row.tenantId,
      tenantName: row.tenant.name,
      tenantSlug: row.tenant.slug,
      role: row.role,
    })),
  };
}

export async function requireTenantAdmin() {
  const ctx = await requireTenant();
  if (ctx.platformRole !== "ADMIN" && !SETTINGS_ROLES.includes(ctx.tenantRole)) {
    redirect("/dashboard");
  }
  return ctx;
}

/** Brokers / accountants / admins — not buyer or publisher portal users. */
export async function requireBrokerOps() {
  const ctx = await requireTenant();
  if (ctx.platformRole !== "ADMIN" && !BROKER_OPS_ROLES.includes(ctx.tenantRole)) {
    redirect("/dashboard");
  }
  return ctx;
}

export function canWrite(role: TenantRoleValue, platformRole?: string) {
  return platformRole === "ADMIN" || WRITE_ROLES.includes(role);
}

export function canApprovePayments(role: TenantRoleValue, platformRole?: string) {
  return platformRole === "ADMIN" || APPROVER_ROLES.includes(role);
}

export function isBuyerPortal(ctx: TenantContext) {
  return ctx.tenantRole === TenantRole.BUYER;
}

export function isPublisherPortal(ctx: TenantContext) {
  return ctx.tenantRole === TenantRole.PUBLISHER;
}

/** Extra buyerId filter for portal buyers; brokers see all (or URL filter). */
export function scopedBuyerFilter(ctx: TenantContext, requestedBuyerId?: string | null) {
  if (isBuyerPortal(ctx)) {
    return ctx.linkedBuyerId ?? "__none__";
  }
  if (isPublisherPortal(ctx)) {
    return "__none__";
  }
  return requestedBuyerId || undefined;
}

/** Extra publisherId filter for portal publishers. */
export function scopedPublisherFilter(ctx: TenantContext, requestedPublisherId?: string | null) {
  if (isPublisherPortal(ctx)) {
    return ctx.linkedPublisherId ?? "__none__";
  }
  if (isBuyerPortal(ctx)) {
    return "__none__";
  }
  return requestedPublisherId || undefined;
}

export function assertBuyerInvoiceAccess(ctx: TenantContext, invoiceBuyerId: string) {
  if (isPublisherPortal(ctx)) redirect("/dashboard");
  if (isBuyerPortal(ctx) && ctx.linkedBuyerId !== invoiceBuyerId) redirect("/buyers");
}

export function assertPublisherInvoiceAccess(ctx: TenantContext, invoicePublisherId: string) {
  if (isBuyerPortal(ctx)) redirect("/dashboard");
  if (isPublisherPortal(ctx) && ctx.linkedPublisherId !== invoicePublisherId) redirect("/publishers");
}
