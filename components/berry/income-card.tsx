"use client";

import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
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
  return (
    <MainCard
      content={false}
      sx={
        dark
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
          : undefined
      }
    >
      <Box sx={{ p: 2 }}>
        <List sx={{ py: 0 }}>
          <ListItem alignItems="center" disableGutters sx={{ py: 0 }}>
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: dark ? berryColors.primary800 : berryColors.warningLight,
                  color: dark ? "#fff" : berryColors.orangeDark,
                }}
              >
                {icon}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography variant="h4" sx={{ color: dark ? "common.white" : "inherit" }}>
                  {value}
                </Typography>
              }
              secondary={
                <Typography
                  variant="subtitle2"
                  sx={{ color: dark ? berryColors.primaryLight : "text.secondary", mt: 0.25 }}
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
