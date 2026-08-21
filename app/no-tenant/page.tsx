import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CompanyCreateForm } from "@/components/company-create-form";
import { Logo } from "@/components/berry/logo";
import { MainCard } from "@/components/berry/main-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { isPlatformAdminHost, platformAdminPublicUrl } from "@/lib/platform-host";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/roles";
import { requireSessionUser } from "@/lib/tenant";

export default async function NoTenantPage() {
  const session = await requireSessionUser();
  const count = await prisma.tenantMembership.count({ where: { userId: session.user.id } });
  if (count > 0) redirect("/dashboard");
  if (session.user.role === Role.ADMIN) {
    const host = (await headers()).get("host");
    redirect(isPlatformAdminHost(host) ? "/admin" : `${platformAdminPublicUrl()}/admin`);
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", position: "relative", px: 2 }}>
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>
      <MainCard sx={{ maxWidth: 480 }} contentSX={{ display: "grid", gap: 2 }}>
        <Logo />
        <Typography variant="h3" sx={{ mt: 1 }}>
          Create your first company
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Set your company name, address, and bank account. You can edit these later in Settings. If this company already exists, ask an admin for an invite.
        </Typography>
        <CompanyCreateForm />
      </MainCard>
    </Box>
  );
}
