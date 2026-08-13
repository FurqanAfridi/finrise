export type AvatarTemplate = {
  key: string;
  label: string;
  /** Soft fill background */
  bg: string;
  /** Icon / monogram color */
  fg: string;
  /** Simple glyph hint for the picker */
  glyph: string;
};

/** Curated profile avatar templates — no uploads required. */
export const AVATAR_TEMPLATES: AvatarTemplate[] = [
  { key: "teal", label: "Brand", bg: "#E8F0EC", fg: "#366450", glyph: "◆" },
  { key: "forest", label: "Forest", bg: "#E6F4EC", fg: "#1B7A4E", glyph: "♣" },
  { key: "ocean", label: "Ocean", bg: "#E8F1F8", fg: "#2B6CB0", glyph: "◎" },
  { key: "slate", label: "Slate", bg: "#EEF1F4", fg: "#4A5568", glyph: "■" },
  { key: "sand", label: "Sand", bg: "#F7F1E8", fg: "#8B6914", glyph: "●" },
  { key: "coral", label: "Coral", bg: "#F9EDEA", fg: "#C0392B", glyph: "▲" },
  { key: "violet", label: "Violet", bg: "#F0EDF7", fg: "#5B4B8A", glyph: "✦" },
  { key: "amber", label: "Amber", bg: "#FBF3E6", fg: "#B86A00", glyph: "★" },
];

export const DEFAULT_AVATAR_KEY = "teal";

export function resolveAvatarKey(key?: string | null): string {
  if (key && AVATAR_TEMPLATES.some((row) => row.key === key)) return key;
  return DEFAULT_AVATAR_KEY;
}

export function getAvatarTemplate(key?: string | null): AvatarTemplate {
  const resolved = resolveAvatarKey(key);
  return AVATAR_TEMPLATES.find((row) => row.key === resolved) ?? AVATAR_TEMPLATES[0];
}
