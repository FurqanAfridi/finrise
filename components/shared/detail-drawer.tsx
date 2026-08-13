"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconX } from "@tabler/icons-react";

const DRAWER_WIDTH = 400;

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: DRAWER_WIDTH },
            maxWidth: "100%",
            bgcolor: "background.paper",
            borderLeft: "1px solid",
            borderColor: "divider",
          },
        },
        backdrop: {
          sx: { bgcolor: "rgb(15 20 25 / 32%)" },
        },
      }}
      transitionDuration={{ enter: 200, exit: 150 }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            px: 2.5,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18 }} noWrap>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          <IconButton onClick={onClose} aria-label="Close details" sx={{ minWidth: 44, minHeight: 44 }}>
            <IconX size={20} stroke={1.5} />
          </IconButton>
        </Stack>
        <Box sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2.5 }}>{children}</Box>
      </Box>
    </Drawer>
  );
}
