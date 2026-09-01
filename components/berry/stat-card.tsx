"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { MainCard } from "./main-card";
import { berryColors } from "@/theme/berry";

type Tone = "secondary" | "primary" | "error" | "warning";

function useToneColors(tone: Tone) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (isDark) {
    const map: Record<Tone, { bg: string; accent: string; label: string; value: string }> = {
      primary: {
        bg: "var(--fr-primary-muted)",
        accent: "var(--fr-primary)",
        label: "var(--fr-text-muted)",
        value: "var(--fr-primary)",
      },
      secondary: {
        bg: "var(--fr-surface)",
        accent: "var(--fr-info)",
        label: "var(--fr-text-muted)",
        value: "var(--fr-text)",
      },
      error: {
        bg: "var(--fr-danger-muted)",
        accent: "var(--fr-danger)",
        label: "var(--fr-text-muted)",
        value: "var(--fr-danger)",
      },
      warning: {
        bg: "var(--fr-warning-muted)",
        accent: "var(--fr-warning)",
        label: "var(--fr-text-muted)",
        value: "var(--fr-warning)",
      },
    };
    return map[tone];
  }

  const lightMap: Record<Tone, { bg: string; accent: string; label: string; value: string }> = {
    secondary: {
      bg: berryColors.secondaryDark,
      accent: berryColors.secondary800,
      label: berryColors.secondary200,
      value: "#FFFFFF",
    },
    primary: {
      bg: berryColors.primaryDark,
      accent: berryColors.primary800,
      label: berryColors.primary200,
      value: "#FFFFFF",
    },
    error: {
      bg: berryColors.errorDark,
      accent: berryColors.errorMain,
      label: berryColors.errorLight,
      value: "#FFFFFF",
    },
    warning: {
      bg: berryColors.orangeDark,
      accent: berryColors.orangeMain,
      label: "#ffe0b2",
      value: "#FFFFFF",
    },
  };
  return lightMap[tone];
}

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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useToneColors(tone);

  return (
    <MainCard
      content={false}
      sx={{
        bgcolor: colors.bg,
        color: isDark ? "var(--fr-text)" : colors.value,
        overflow: "hidden",
        position: "relative",
        borderLeft: isDark ? `3px solid ${colors.accent}` : undefined,
        ...(!isDark
          ? {
              "&:after": {
                content: '""',
                position: "absolute",
                width: 210,
                height: 210,
                background: colors.accent,
                borderRadius: "50%",
                top: -85,
                right: -95,
              },
              "&:before": {
                content: '""',
                position: "absolute",
                width: 210,
                height: 210,
                background: colors.accent,
                borderRadius: "50%",
                top: -125,
                right: -15,
                opacity: 0.5,
              },
            }
          : {}),
      }}
    >
      <Box sx={{ p: 2.25, position: "relative", zIndex: 1 }}>
        {icon ? (
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : colors.accent,
              color: isDark ? colors.accent : "#fff",
              width: 44,
              height: 44,
              borderRadius: 2,
              mb: 1,
            }}
          >
            {icon}
          </Avatar>
        ) : null}
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <Typography
            className="fr-money"
            sx={{
              fontSize: "1.65rem",
              fontWeight: 600,
              mr: 1,
              mt: 1.25,
              mb: 0.5,
              color: isDark ? colors.value : colors.value,
            }}
          >
            {value}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: "1rem", fontWeight: 500, color: colors.label }}>{label}</Typography>
        {hint ? (
          <Typography variant="caption" sx={{ color: isDark ? "var(--fr-text-muted)" : "rgba(255,255,255,0.72)" }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </MainCard>
  );
}
