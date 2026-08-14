import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ResetPasswordForm } from "./reset-form";
import { Logo } from "@/components/berry/logo";
import { MainCard } from "@/components/berry/main-card";
import { PoweredBy } from "@/components/powered-by";
import { ThemeToggle } from "@/components/theme-toggle";
import { prisma } from "@/lib/prisma";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await prisma.passwordReset.findUnique({ where: { token } });
  const invalid = !row || row.usedAt || row.expiresAt < new Date();

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
              Choose a new password
            </Typography>
            {invalid ? (
              <Typography color="error" variant="body2" sx={{ textAlign: "center" }}>
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </Typography>
            ) : (
              <>
                <Typography variant="caption" sx={{ fontSize: 16, color: "text.secondary", textAlign: "center" }}>
                  Use at least 8 characters.
                </Typography>
                <ResetPasswordForm token={token} />
              </>
            )}
            <PoweredBy />
          </Stack>
        </Box>
      </MainCard>
    </Box>
  );
}
