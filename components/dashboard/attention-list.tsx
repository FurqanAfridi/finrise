import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MainCard } from "@/components/berry/main-card";
import { StatusPill } from "@/components/shared/status-pill";
import { formatMoney } from "@/lib/money";
import type { AttentionItem } from "@/lib/queries";

export function AttentionList({
  title,
  empty,
  items,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  empty: string;
  items: AttentionItem[];
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <MainCard
      title={title}
      secondary={
        <Link href={viewAllHref} style={{ textDecoration: "none" }}>
          <Button size="small" color="primary" sx={{ minHeight: 44 }}>
            {viewAllLabel}
          </Button>
        </Link>
      }
    >
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {empty}
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {items.map((row) => (
            <Box
              key={row.id}
              sx={{
                borderRadius: 1,
                "&:hover": { bgcolor: "action.hover" },
                "&:focus-within": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              }}
            >
              <Link href={row.href} style={{ textDecoration: "none", color: "inherit" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    minHeight: 44,
                    px: 0.5,
                    py: 0.75,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {row.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                      {row.detail}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
                    {row.amount != null ? (
                      <Typography className="fr-money" variant="body2" sx={{ fontWeight: 600 }}>
                        {formatMoney(row.amount)}
                      </Typography>
                    ) : null}
                    <StatusPill kind={row.pill} />
                  </Stack>
                </Box>
              </Link>
            </Box>
          ))}
        </Stack>
      )}
    </MainCard>
  );
}
