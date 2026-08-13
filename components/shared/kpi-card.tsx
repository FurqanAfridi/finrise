"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { MainCard } from "@/components/berry/main-card";

/** Calm KPI card — surface + primary accent on the value only. */
export function KpiCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <MainCard content={false} sx={{ height: "100%" }}>
      <Box sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography
          className="fr-money"
          sx={{
            mt: 1,
            fontSize: "1.5rem",
            fontWeight: 650,
            letterSpacing: "-0.02em",
            color: "primary.main",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.45 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </MainCard>
  );
}
