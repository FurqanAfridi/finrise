"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import { getAvatarTemplate } from "@/lib/avatars";

export function UserAvatar({
  avatarKey,
  email,
  name,
  size = 34,
}: {
  avatarKey?: string | null;
  email?: string | null;
  name?: string | null;
  size?: number;
}) {
  const template = getAvatarTemplate(avatarKey);
  const initial = (name?.trim() || email || "F").slice(0, 1).toUpperCase();

  return (
    <Avatar
      sx={{
        position: "relative",
        width: size,
        height: size,
        bgcolor: template.bg,
        color: template.fg,
        fontSize: Math.max(12, Math.round(size * 0.38)),
        fontWeight: 700,
        border: "1px solid",
        borderColor: "divider",
      }}
      aria-label={template.label}
    >
      <Box component="span" sx={{ lineHeight: 1, fontSize: "inherit" }}>
        {template.glyph}
      </Box>
      <Box
        component="span"
        sx={{
          position: "absolute",
          fontSize: Math.max(9, Math.round(size * 0.28)),
          fontWeight: 700,
          opacity: 0.9,
          bottom: size > 40 ? 6 : 3,
          right: size > 40 ? 7 : 4,
        }}
      >
        {initial}
      </Box>
    </Avatar>
  );
}
