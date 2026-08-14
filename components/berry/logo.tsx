"use client";

import Image from "next/image";
import Box from "@mui/material/Box";
import { useColorMode } from "@/components/color-mode";
import { APP_NAME } from "@/lib/brand";

/** Bump when brand assets change to defeat browser/CDN image caches. */
export const BRAND_LOGO_VERSION = "20260814b";

const LIGHT_MARK = `/brand/logo-mark.png?v=${BRAND_LOGO_VERSION}`;
const DARK_MARK = `/brand/logo-mark-dark.png?v=${BRAND_LOGO_VERSION}`;
const LIGHT_WORDMARK = `/brand/logo.png?v=${BRAND_LOGO_VERSION}`;
const DARK_WORDMARK = `/brand/logo-dark.png?v=${BRAND_LOGO_VERSION}`;
const WORDMARK_RATIO = 590 / 104;

export function Logo({ compact = false, size = 34 }: { compact?: boolean; size?: number }) {
  const { mode } = useColorMode();
  const dark = mode === "dark";
  const markSrc = dark ? DARK_MARK : LIGHT_MARK;
  const wordSrc = dark ? DARK_WORDMARK : LIGHT_WORDMARK;
  const wordWidth = Math.round(size * WORDMARK_RATIO);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        minWidth: 0,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {compact ? (
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
            key={markSrc}
            src={markSrc}
            alt={APP_NAME}
            width={size}
            height={size}
            priority
            unoptimized
            style={{ objectFit: "contain", display: "block" }}
          />
        </Box>
      ) : (
        <Image
          key={wordSrc}
          src={wordSrc}
          alt={APP_NAME}
          width={wordWidth}
          height={size}
          priority
          unoptimized
          style={{ objectFit: "contain", display: "block", height: size, width: "auto", maxWidth: 200 }}
        />
      )}
    </Box>
  );
}
