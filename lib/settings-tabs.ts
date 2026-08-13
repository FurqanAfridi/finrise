export const SETTINGS_TABS = [
  { id: "profile", label: "Profile" },
  { id: "company", label: "Company" },
  { id: "companies", label: "Companies" },
  { id: "branding", label: "Branding" },
  { id: "email", label: "Email" },
  { id: "finance", label: "Finance" },
  { id: "team", label: "Team" },
  { id: "import", label: "Import" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export const PERSONAL_SETTINGS_TABS = SETTINGS_TABS.filter(
  (tab) => tab.id === "profile" || tab.id === "companies",
);

export function parseSettingsTab(value?: string | string[]): SettingsTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  return SETTINGS_TABS.some((tab) => tab.id === raw) ? (raw as SettingsTabId) : "company";
}
