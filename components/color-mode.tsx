"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PaletteMode } from "@mui/material/styles";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { COLOR_MODE_KEY, createBerryTheme } from "@/theme/berry";

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "light",
  toggleColorMode: () => undefined,
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

function readStoredMode(): PaletteMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(COLOR_MODE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>("light");

  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.colorMode = mode;
    document.documentElement.style.colorScheme = mode;
    window.localStorage.setItem(COLOR_MODE_KEY, mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggleColorMode: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode],
  );

  const theme = useMemo(() => createBerryTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
