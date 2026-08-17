"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconX } from "@tabler/icons-react";
import { MainCard } from "@/components/berry/main-card";

export type FilterChip = {
  key: string;
  label: string;
};

function clearHref(basePath: string, query: Record<string, string>, removeKey?: string) {
  const next = { ...query };
  if (removeKey) {
    delete next[removeKey];
    if (removeKey === "year") delete next.month;
    if (removeKey === "month") delete next.year;
    if (removeKey === "from") delete next.to;
    if (removeKey === "to") delete next.from;
  } else {
    for (const key of Object.keys(next)) delete next[key];
  }
  delete next.page;
  const usp = new URLSearchParams(next);
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function FilterBar({
  basePath,
  query,
  chips,
  children,
}: {
  basePath: string;
  query: Record<string, string>;
  chips: FilterChip[];
  children: React.ReactNode;
}) {
  return (
    <MainCard sx={{ mb: 3 }} contentSX={{ display: "grid", gap: 2 }}>
      <Box
        component="form"
        method="get"
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, minmax(0, 1fr)) auto" },
          alignItems: "end",
        }}
      >
        {children}
        <Button type="submit" variant="contained" color="primary" sx={{ height: 40 }}>
          Apply filters
        </Button>
      </Box>
      {chips.length > 0 ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Active
          </Typography>
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              component={Link}
              href={clearHref(basePath, query, chip.key)}
              clickable
              size="small"
              label={chip.label}
              onDelete={() => undefined}
              deleteIcon={
                <Box component="span" sx={{ display: "inline-flex", ml: 0.25 }} aria-hidden>
                  <IconX size={14} />
                </Box>
              }
              sx={{ fontWeight: 500, textDecoration: "none" }}
            />
          ))}
          <Button component={Link} href={clearHref(basePath, query)} size="small" color="primary">
            Clear all
          </Button>
        </Stack>
      ) : null}
    </MainCard>
  );
}
