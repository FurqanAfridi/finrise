import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { requireTenant, requireTenantAdmin } from "@/lib/tenant";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  return requireTenantAdmin();
}

export { requireTenant, requireTenantAdmin };

export async function requirePlatformAdmin() {
  const session = await requireSession();
  if (session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }
  return session;
}
