import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  const [unread, userRows] = await Promise.all([
    prisma.notification.count({
      where: { tenantId: ctx.tenantId, userId: ctx.userId, readAt: null },
    }),
    prisma.$queryRaw<{ name: string | null; avatarKey: string | null }[]>`
      SELECT name, "avatarKey" FROM "User" WHERE id = ${ctx.userId} LIMIT 1
    `,
  ]);
  const user = userRows[0];
  return (
    <AppShell
      email={ctx.email}
      name={user?.name ?? ctx.name}
      avatarKey={user?.avatarKey ?? null}
      tenantName={ctx.tenantName}
      tenantId={ctx.tenantId}
      tenantRole={ctx.tenantRole}
      memberships={ctx.memberships}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
