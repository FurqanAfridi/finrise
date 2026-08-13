"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ColorModeProvider } from "@/components/color-mode";

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ColorModeProvider>{children}</ColorModeProvider>
    </AppRouterCacheProvider>
  );
}
