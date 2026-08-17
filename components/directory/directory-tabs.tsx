"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

export const DIRECTORY_TABS = [
  { id: "buyers", label: "Buyers", href: "/directory?tab=buyers" },
  { id: "publishers", label: "Publishers", href: "/directory?tab=publishers" },
  { id: "verticals", label: "Verticals", href: "/directory?tab=verticals" },
] as const;

export type DirectoryTabId = (typeof DIRECTORY_TABS)[number]["id"];

export function DirectoryTabs({ active }: { active: DirectoryTabId }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        mb: 3,
        pb: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {DIRECTORY_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <Button
            key={tab.id}
            component={Link}
            href={tab.href}
            scroll={false}
            variant="text"
            sx={{
              minWidth: 0,
              minHeight: 44,
              px: 1.75,
              py: 0.75,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: selected ? 600 : 500,
              fontSize: 14,
              color: selected ? "text.primary" : "text.secondary",
              bgcolor: selected ? "action.hover" : "transparent",
              "&:hover": { bgcolor: "action.hover", color: "text.primary" },
            }}
          >
            {tab.label}
          </Button>
        );
      })}
    </Box>
  );
}
