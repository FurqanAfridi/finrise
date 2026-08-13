import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Role } from "@/lib/roles";
import { auth } from "@/auth";
import { isPlatformAdminHost } from "@/lib/platform-host";
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
    const host = (await headers()).get("host");
    redirect(isPlatformAdminHost(host) ? "/login?error=forbidden" : "/dashboard");
  }
  return session;
}
