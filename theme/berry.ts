"use client";

import { createTheme, type PaletteMode, type Theme } from "@mui/material/styles";

/** FinRise token values mirrored for MUI until full CSS-var migration. */
const light = {
  background: "#FAFBFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F5F7",
  border: "#E5E9EF",
  text: "#1B2430",
  textMuted: "#6B7785",
  primary: "#366450",
  primaryHover: "#2B503F",
  primaryMuted: "#E8F0EC",
  success: "#1B7A4E",
  successMuted: "#E6F5EE",
  warning: "#B86A00",
  warningMuted: "#FFF4E5",
  danger: "#C0392B",
  dangerMuted: "#FDECEA",
  info: "#2B6CB0",
  infoMuted: "#E8F1FB",
};

const dark = {
  background: "#0B1411",
  surface: "#15241E",
  surfaceMuted: "#101C17",
  border: "#2C4339",
  text: "#F1F7F3",
  textMuted: "#A3B8AC",
  primary: "#5ECF8E",
  primaryHover: "#79E0A4",
  primaryMuted: "#163528",
  success: "#4ADE80",
  successMuted: "#123024",
  warning: "#F0B429",
  warningMuted: "#3A2E12",
  danger: "#FF7B72",
  dangerMuted: "#3D1C1A",
  info: "#6CBCF0",
  infoMuted: "#163246",
};

/** @deprecated Prefer CSS vars / palette; kept for gradual migration. */
export const berryColors = {
  primaryLight: light.primaryMuted,
  primary200: "#8FAF9C",
  primaryMain: light.primary,
  primaryDark: light.primaryHover,
  primary800: light.primaryHover,
  secondaryLight: light.primaryMuted,
  secondary200: "#8FAF9C",
  secondaryMain: light.primary,
  secondaryDark: light.primaryHover,
  secondary800: light.primaryHover,
  successLight: light.successMuted,
  successMain: light.success,
  successDark: light.success,
  errorLight: light.dangerMuted,
  errorMain: light.danger,
  errorDark: light.danger,
  warningLight: light.warningMuted,
  warningMain: light.warning,
  warningDark: light.warning,
  orangeMain: light.warning,
  orangeDark: light.warning,
  paper: light.surface,
  grey50: light.surfaceMuted,
  grey100: light.background,
  grey200: light.border,
  grey500: light.textMuted,
  grey600: light.textMuted,
  grey700: light.text,
  grey900: light.text,
};

export const drawerWidth = 260;
export const drawerCollapsedWidth = 72;
export const contentMaxWidth = 1200;
export const gridSpacing = 3;
export const COLOR_MODE_KEY = "finrise-color-mode";

function sharedTypography() {
  return {
    fontFamily: 'var(--font-inter), Inter, system-ui, -apple-system, sans-serif',
    h6: { fontWeight: 500, fontSize: "0.75rem" },
    h5: { fontSize: "0.875rem", fontWeight: 600 },
    h4: { fontSize: "1.125rem", fontWeight: 600 },
    h3: { fontSize: "1.25rem", fontWeight: 600 },
    h2: { fontSize: "1.5rem", fontWeight: 650 },
    h1: { fontSize: "2rem", fontWeight: 700 },
    subtitle1: { fontSize: "0.875rem", fontWeight: 500 },
    subtitle2: { fontSize: "0.75rem", fontWeight: 400 },
    caption: { fontSize: "0.75rem", fontWeight: 400 },
    body1: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.5 },
    body2: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.55 },
    button: { textTransform: "none" as const, fontWeight: 600 },
  };
}

export function createBerryTheme(mode: PaletteMode): Theme {
  const isDark = mode === "dark";
  const t = isDark ? dark : light;

  return createTheme({
    direction: "ltr",
    palette: {
      mode,
      primary: {
        light: t.primaryMuted,
        main: t.primary,
        dark: t.primaryHover,
        contrastText: isDark ? "#06110C" : "#FFFFFF",
      },
      secondary: {
        light: t.primaryMuted,
        main: t.primary,
        dark: t.primaryHover,
        contrastText: isDark ? "#06110C" : "#FFFFFF",
      },
      error: {
        light: t.dangerMuted,
        main: t.danger,
        dark: t.danger,
      },
      warning: {
        light: t.warningMuted,
        main: t.warning,
        dark: t.warning,
      },
      success: {
        light: t.successMuted,
        main: t.success,
        dark: t.success,
      },
      info: {
        light: t.infoMuted,
        main: t.info,
        dark: t.info,
      },
      grey: {
        50: t.surfaceMuted,
        100: t.background,
        200: t.border,
        500: t.textMuted,
        600: t.textMuted,
        700: t.text,
        900: t.text,
      },
      text: {
        primary: t.text,
        secondary: t.textMuted,
      },
      divider: t.border,
      background: {
        paper: t.surface,
        default: t.background,
      },
    },
    typography: sharedTypography(),
    shape: { borderRadius: 12 },
    mixins: {
      toolbar: { minHeight: 64 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.background,
            color: t.text,
            overflowY: "auto",
            overflowX: "hidden",
            height: "auto",
          },
          ".tabular-nums, .fr-money": {
            fontVariantNumeric: "tabular-nums",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
            textTransform: "none",
            minHeight: 40,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: "none",
            boxShadow: isDark
              ? "0 1px 2px rgb(0 0 0 / 24%), 0 8px 24px rgb(0 0 0 / 28%)"
              : "0 1px 2px rgb(27 36 48 / 4%), 0 4px 16px rgb(27 36 48 / 6%)",
            border: `1px solid ${t.border}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderBottom: `1px solid ${t.border}`,
            boxShadow: "none",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: t.surface,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            color: t.textMuted,
            fontWeight: 600,
            backgroundColor: t.surfaceMuted,
            borderBottom: `1px solid ${t.border}`,
          },
          body: {
            borderBottom: `1px solid ${t.border}`,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: isDark ? "rgba(61, 155, 134, 0.08)" : "rgba(31, 107, 90, 0.04)",
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            marginBottom: 2,
            minHeight: 44,
            "&.Mui-selected": {
              backgroundColor: t.primaryMuted,
              color: t.primary,
              "& .MuiListItemIcon-root": { color: t.primary },
              "&:hover": {
                backgroundColor: t.primaryMuted,
              },
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            border: `1px solid ${t.border}`,
          },
        },
      },
    },
  });
}

export const berryTheme = createBerryTheme("light");
