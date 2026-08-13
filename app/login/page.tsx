import { headers } from "next/headers";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/berry/logo";
import { MainCard } from "@/components/berry/main-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { isPlatformAdminHost } from "@/lib/platform-host";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const adminHost = isPlatformAdminHost((await headers()).get("host"));
  const defaultCallback = adminHost ? "/admin" : "/dashboard";

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
              {adminHost ? "Platform admin" : "Hi, Welcome Back"}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 16, color: "text.secondary", textAlign: "center" }}>
              {adminHost
                ? "Sign in with your platform admin account. Access is invite-only."
                : "Enter your credentials to continue"}
            </Typography>
            <Box component="form" action={loginAction} sx={{ width: 1, display: "grid", gap: 2 }}>
              <input type="hidden" name="callbackUrl" value={params.callbackUrl ?? defaultCallback} />
              <TextField name="email" type="email" label="Email Address" fullWidth required autoComplete="email" />
              <TextField
                name="password"
                type="password"
                label="Password"
                fullWidth
                required
                autoComplete="current-password"
              />
              {params.error === "1" ? (
                <Typography color="error" variant="body2">
                  Invalid email or password.
                </Typography>
              ) : null}
              {params.error === "forbidden" ? (
                <Typography color="error" variant="body2">
                  This account is not a platform admin. Ask the owner for an invite.
                </Typography>
              ) : null}
              <Button color="secondary" fullWidth size="large" type="submit" variant="contained">
                Sign In
              </Button>
            </Box>
            {!adminHost ? (
              <>
                <Divider sx={{ width: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  New here?{" "}
                  <Link href="/signup" style={{ color: "inherit", fontWeight: 600 }}>
                    Create an account
                  </Link>
                </Typography>
              </>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                No public signup on this site. Use an invite link from the platform owner.
              </Typography>
            )}
          </Stack>
        </Box>
      </MainCard>
    </Box>
  );
}
