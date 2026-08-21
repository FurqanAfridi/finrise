import Link from "next/link";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SignupForm } from "./signup-form";
import { Logo } from "@/components/berry/logo";
import { MainCard } from "@/components/berry/main-card";
import { PoweredBy } from "@/components/powered-by";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignupPage() {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 4, position: "relative" }}>
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>
      <MainCard content={false} sx={{ width: "100%", maxWidth: 640 }}>
        <Box sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack sx={{ alignItems: "center", gap: 2 }}>
            <Logo />
            <Typography variant="h2" color="secondary">
              Create your account
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 16, color: "text.secondary", textAlign: "center" }}>
              Company details and bank account are printed on invoices. A company admin can edit them later in Settings.
            </Typography>
            <SignupForm />
            <Divider sx={{ width: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Already have an account?{" "}
              <Link href="/login" style={{ color: "inherit", fontWeight: 600 }}>
                Sign in
              </Link>
            </Typography>
            <PoweredBy />
          </Stack>
        </Box>
      </MainCard>
    </Box>
  );
}
