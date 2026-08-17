"use client";

import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SETTINGS_TABS, type SettingsTabId } from "@/lib/settings-tabs";

export type { SettingsTabId };
export { SETTINGS_TABS };

export function SettingsTabs({
  active,
  tabs = SETTINGS_TABS,
}: {
  active: SettingsTabId;
  tabs?: readonly { id: SettingsTabId; label: string }[];
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        mb: 4,
        pb: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Button
            key={tab.id}
            component={Link}
            href={`/settings?tab=${tab.id}`}
            scroll={false}
            variant="text"
            sx={{
              minWidth: 0,
              px: 1.75,
              py: 0.75,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: selected ? 600 : 500,
              fontSize: 14,
              color: selected ? "text.primary" : "text.secondary",
              bgcolor: selected ? "action.hover" : "transparent",
              "&:hover": { bgcolor: "action.hover", color: "text.primary" },
            }}
          >
            {tab.label}
          </Button>
        );
      })}
    </Box>
  );
}

export function SettingsSection({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="h3" sx={{ mb: description ? 0.75 : 2, fontSize: 18, fontWeight: 700 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: { xs: "100%", md: 720 }, lineHeight: 1.6 }}>
          {description}
        </Typography>
      ) : null}
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
          width: "100%",
          minWidth: 0,
        }}
      >
        {children}
      </Box>
      {footer ? <Box sx={{ mt: 2 }}>{footer}</Box> : null}
    </Box>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
  action,
  align = "center",
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: action
            ? "minmax(160px, 240px) minmax(0, 1fr) minmax(min-content, max-content)"
            : "minmax(160px, 240px) minmax(0, 1fr)",
        },
        gap: { xs: 1.25, md: 3 },
        alignItems: { xs: "stretch", md: align },
        px: { xs: 2, md: 3 },
        py: 2.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{label}</Typography>
        {hint ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.55 }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
      {children != null ? (
        <Box sx={{ minWidth: 0, width: "100%", display: "flex", alignItems: align === "start" ? "flex-start" : "center" }}>
          {children}
        </Box>
      ) : (
        <span />
      )}
      {action ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "flex-start", md: "flex-end" },
            flexWrap: "wrap",
            gap: 1,
            minWidth: 0,
          }}
        >
          {action}
        </Box>
      ) : null}
    </Box>
  );
}

export function SettingsValue({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 14, fontWeight: 500, wordBreak: "break-word" }}>{children}</Typography>
  );
}

export function LockedChip() {
  return <Chip label="Locked" size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
}

export function SettingsPersonRow({
  name,
  email,
  action,
}: {
  name: string;
  email: string;
  action?: React.ReactNode;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || email.slice(0, 1).toUpperCase() || "?";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: { xs: 2, md: 3 },
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
        <Avatar sx={{ width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>{initials}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{name}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {email}
          </Typography>
        </Box>
      </Stack>
      {action}
    </Box>
  );
}
