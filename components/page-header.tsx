"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: "flex-end", justifyContent: "space-between", mb: 3, gap: 2, flexWrap: "wrap" }}
    >
      <div>
        <Typography variant="h2">{title}</Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </div>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {children}
        {actionHref && actionLabel ? (
          <Link href={actionHref}>
            <Button variant="contained" color="primary">
              {actionLabel}
            </Button>
          </Link>
        ) : null}
      </Stack>
    </Stack>
  );
}
