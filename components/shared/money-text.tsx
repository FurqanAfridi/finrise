"use client";

import Typography from "@mui/material/Typography";
import type { TypographyProps } from "@mui/material/Typography";
import { formatMoney } from "@/lib/money";

/** Monetary figure with mandatory tabular numerals. */
export function MoneyText({
  value,
  currency = "USD",
  variant = "body2",
  sx,
  ...rest
}: {
  value: number;
  currency?: string;
} & Omit<TypographyProps, "children">) {
  return (
    <Typography
      variant={variant}
      component="span"
      className="fr-money"
      sx={{ fontVariantNumeric: "tabular-nums", ...sx }}
      {...rest}
    >
      {formatMoney(value, currency)}
    </Typography>
  );
}
