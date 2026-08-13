"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        textAlign: "center",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 16 }}>{title}</Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 360, mx: "auto", lineHeight: 1.55 }}>
          {description}
        </Typography>
      ) : null}
      {actionHref && actionLabel ? (
        <Box sx={{ mt: 2.5 }}>
          <Link href={actionHref}>
            <Button variant="contained" color="primary">
              {actionLabel}
            </Button>
          </Link>
        </Box>
      ) : null}
    </Box>
  );
}
