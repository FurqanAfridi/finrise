"use client";

import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { MainCard } from "./main-card";
import { berryColors } from "@/theme/berry";

export function IncomeCard({
  label,
  value,
  hint,
  icon,
  dark = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  dark?: boolean;
}) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const useAccent = dark && !isDarkMode;

  return (
    <MainCard
      content={false}
      sx={
        useAccent
          ? {
              bgcolor: berryColors.primaryDark,
              color: berryColors.primaryLight,
              overflow: "hidden",
              position: "relative",
              "&:after": {
                content: '""',
                position: "absolute",
                width: 210,
                height: 210,
                background: `linear-gradient(210.04deg, ${berryColors.primary200} -50.94%, rgba(144, 202, 249, 0) 83.49%)`,
                borderRadius: "50%",
                top: -30,
                right: -180,
              },
            }
          : dark && isDarkMode
            ? {
                bgcolor: "var(--fr-primary-muted)",
                borderLeft: "3px solid var(--fr-primary)",
                overflow: "hidden",
              }
            : undefined
      }
    >
      <Box sx={{ p: 2, position: "relative", zIndex: 1 }}>
        <List sx={{ py: 0 }}>
          <ListItem alignItems="center" disableGutters sx={{ py: 0 }}>
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: useAccent
                    ? berryColors.primary800
                    : dark && isDarkMode
                      ? "rgba(255,255,255,0.06)"
                      : berryColors.warningLight,
                  color: useAccent
                    ? "#fff"
                    : dark && isDarkMode
                      ? "var(--fr-primary)"
                      : berryColors.orangeDark,
                }}
              >
                {icon}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography
                  variant="h4"
                  sx={{
                    color: useAccent ? "common.white" : dark && isDarkMode ? "var(--fr-primary)" : "inherit",
                  }}
                >
                  {value}
                </Typography>
              }
              secondary={
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: useAccent
                      ? berryColors.primaryLight
                      : dark && isDarkMode
                        ? "var(--fr-text-muted)"
                        : "text.secondary",
                    mt: 0.25,
                  }}
                >
                  {label}
                  {hint ? ` · ${hint}` : ""}
                </Typography>
              }
            />
          </ListItem>
        </List>
      </Box>
    </MainCard>
  );
}
