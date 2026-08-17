"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import TableRow from "@mui/material/TableRow";

export function ContactTableRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <TableRow
      hover
      component={Link}
      href={href}
      sx={{
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
      }}
    >
      {children}
    </TableRow>
  );
}

export function ContactCardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
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
