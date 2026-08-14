import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { acceptInvite } from "@/app/actions/ops";
import { Logo } from "@/components/berry/logo";
import { MainCard } from "@/components/berry/main-card";
import { PoweredBy } from "@/components/powered-by";
import { ThemeToggle } from "@/components/theme-toggle";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/roles";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({ where: { token }, include: { tenant: true } });
  const invalid = !invite || invite.usedAt || invite.expiresAt < new Date();
  const platformInvite = Boolean(invite && !invite.tenantId && invite.role === Role.ADMIN);

  async function submit(formData: FormData) {
    "use server";
    const result = await acceptInvite(formData);
    if (result && "ok" in result && result.ok) {
      redirect(platformInvite ? "/login?callbackUrl=/admin" : "/login");
    }
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", px: 2, position: "relative" }}>
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>
      <MainCard content={false} sx={{ width: "100%", maxWidth: 460 }}>
        <Box sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack sx={{ alignItems: "center", gap: 2 }}>
            <Logo />
            <Typography variant="h2" color="secondary">
              Accept your invite
            </Typography>
            {invalid ? (
              <Typography color="error" variant="body2">
                This invite is invalid or has expired. Ask an admin to send a new one.
              </Typography>
            ) : (
              <Box component="form" action={submit} sx={{ width: 1, display: "grid", gap: 2 }}>
                <input type="hidden" name="token" value={token} />
                <Typography variant="body2" color="text.secondary">
                  {platformInvite ? (
                    <>
                      Join the FundLookup <strong>platform admin</strong> team as <strong>{invite.email}</strong>. You will
                      manage companies and data across the platform.
                    </>
                  ) : (
                    <>
                      Join <strong>{invite.tenant?.name}</strong> as {invite.tenantRole.toLowerCase()} for{" "}
                      <strong>{invite.email}</strong>. You can belong to more than one company.
                    </>
                  )}
                </Typography>
                <TextField name="name" label="Name" fullWidth required />
                <TextField
                  name="password"
                  type="password"
                  label="Password"
                  fullWidth
                  required
                  slotProps={{ htmlInput: { minLength: 8 } }}
                />
                <Button color="secondary" fullWidth size="large" type="submit" variant="contained">
                  {platformInvite ? "Join as platform admin" : "Create account"}
                </Button>
              </Box>
            )}
            <PoweredBy />
          </Stack>
        </Box>
      </MainCard>
    </Box>
  );
}
