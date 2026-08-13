"use client";

import IconButton from "@mui/material/IconButton";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useColorMode } from "@/components/color-mode";

export function ThemeToggle() {
  const { mode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      onClick={toggleColorMode}
      aria-label="Toggle color mode"
      sx={{
        width: 40,
        height: 40,
        color: "text.secondary",
        "&:hover": { color: "text.primary", bgcolor: "action.hover" },
      }}
    >
      {mode === "dark" ? <IconSun stroke={1.5} size={20} /> : <IconMoon stroke={1.5} size={20} />}
    </IconButton>
  );
}
