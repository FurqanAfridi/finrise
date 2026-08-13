"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MainCard } from "./main-card";
import { berryColors } from "@/theme/berry";

type Tone = "secondary" | "primary" | "error" | "warning";

const TONE: Record<Tone, { bg: string; circle: string; muted: string }> = {
  secondary: {
    bg: berryColors.secondaryDark,
    circle: berryColors.secondary800,
    muted: berryColors.secondary200,
  },
  primary: {
    bg: berryColors.primaryDark,
    circle: berryColors.primary800,
    muted: berryColors.primary200,
  },
  error: {
    bg: berryColors.errorDark,
    circle: berryColors.errorMain,
    muted: berryColors.errorLight,
  },
  warning: {
    bg: berryColors.orangeDark,
    circle: berryColors.orangeMain,
    muted: "#ffe0b2",
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "secondary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: Tone;
}) {
  const colors = TONE[tone];
  return (
    <MainCard
      content={false}
      sx={{
        bgcolor: colors.bg,
        color: "#fff",
        overflow: "hidden",
        position: "relative",
        "&:after": {
          content: '""',
          position: "absolute",
          width: 210,
          height: 210,
          background: colors.circle,
          borderRadius: "50%",
          top: -85,
          right: -95,
        },
        "&:before": {
          content: '""',
          position: "absolute",
          width: 210,
          height: 210,
          background: colors.circle,
          borderRadius: "50%",
          top: -125,
          right: -15,
          opacity: 0.5,
        },
      }}
    >
      <Box sx={{ p: 2.25, position: "relative", zIndex: 1 }}>
        {icon ? (
          <Avatar
            variant="rounded"
            sx={{ bgcolor: colors.circle, color: "#fff", width: 44, height: 44, borderRadius: 2, mb: 1 }}
          >
            {icon}
          </Avatar>
        ) : null}
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <Typography sx={{ fontSize: "1.65rem", fontWeight: 500, mr: 1, mt: 1.25, mb: 0.5 }}>
            {value}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: "1rem", fontWeight: 500, color: colors.muted }}>{label}</Typography>
        {hint ? (
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)" }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </MainCard>
  );
}
