"use client";

import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useColorMode } from "@/components/color-mode";

/** Bump when brand assets change to defeat browser/CDN image caches. */
export const BRAND_LOGO_VERSION = "20260813g";

export function Logo({ compact = false, size = 34 }: { compact?: boolean; size?: number }) {
  const { mode } = useColorMode();
  const src =
    mode === "dark"
      ? `/brand/logo-mark-dark.png?v=${BRAND_LOGO_VERSION}`
      : `/brand/logo-mark.png?v=${BRAND_LOGO_VERSION}`;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 0 : 1.35,
        minWidth: 0,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        <Image
          key={src}
          src={src}
          alt="FundLookup"
          width={size}
          height={size}
          priority
          unoptimized
          style={{ objectFit: "contain", display: "block" }}
        />
      </Box>
      {!compact ? (
        <Typography
          component="span"
          sx={{
            color: "primary.main",
            letterSpacing: "0.04em",
            fontWeight: 800,
            fontSize: size >= 36 ? 18 : 15,
            lineHeight: 1,
          }}
        >
          FundLookup
        </Typography>
      ) : null}
    </Box>
  );
}
