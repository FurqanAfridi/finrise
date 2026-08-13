"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

function buildHref(basePath: string, query: Record<string, string>, page: number) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) usp.set(key, value);
  }
  usp.set("page", String(page));
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : `${basePath}?page=${page}`;
}

export function Pagination({
  page,
  pageCount,
  basePath,
  query = {},
}: {
  page: number;
  pageCount: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  if (pageCount <= 1) return null;
  return (
    <Stack direction="row" sx={{ mt: 2, alignItems: "center", justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">
        Page {page} of {pageCount}
      </Typography>
      <Stack direction="row" spacing={1}>
        {page > 1 ? (
          <Link href={buildHref(basePath, query, page - 1)}>
            <Button variant="outlined" color="secondary">
              Previous
            </Button>
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link href={buildHref(basePath, query, page + 1)}>
            <Button variant="outlined" color="secondary">
              Next
            </Button>
          </Link>
        ) : null}
      </Stack>
    </Stack>
  );
}
