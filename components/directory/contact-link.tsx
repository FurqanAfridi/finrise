"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

export function ContactTableRow({ children }: { children: React.ReactNode }) {
  return <TableRow hover>{children}</TableRow>;
}

export function ContactNameLink({ href, name, email }: { href: string; name: string; email?: string | null }) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        minHeight: 44,
        py: 0.5,
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
        {name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {email || "No email"}
      </Typography>
    </Box>
  );
}

export function ContactCardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        flex: 1,
        minWidth: 0,
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        textDecoration: "none",
        color: "inherit",
        minHeight: 44,
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      {children}
    </Box>
  );
}
