export const COUNTRIES: { code: string; name: string; dial: string }[] = [
  { code: "US", name: "United States", dial: "+1" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "PK", name: "Pakistan", dial: "+92" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "IE", name: "Ireland", dial: "+353" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "PH", name: "Philippines", dial: "+63" },
  { code: "BD", name: "Bangladesh", dial: "+880" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "QA", name: "Qatar", dial: "+974" },
  { code: "KW", name: "Kuwait", dial: "+965" },
  { code: "BH", name: "Bahrain", dial: "+973" },
  { code: "ZA", name: "South Africa", dial: "+27" },
  { code: "NG", name: "Nigeria", dial: "+234" },
  { code: "KE", name: "Kenya", dial: "+254" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "MX", name: "Mexico", dial: "+52" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "SE", name: "Sweden", dial: "+46" },
  { code: "NO", name: "Norway", dial: "+47" },
  { code: "DK", name: "Denmark", dial: "+45" },
  { code: "PL", name: "Poland", dial: "+48" },
  { code: "TR", name: "Turkey", dial: "+90" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
];

export function countryName(code: string | null | undefined) {
  return COUNTRIES.find((row) => row.code === code)?.name ?? code ?? null;
}

export function countryDial(code: string | null | undefined) {
  return COUNTRIES.find((row) => row.code === code)?.dial ?? "";
}

/** National digits for an input that already shows the country dial code. */
export function nationalPhoneDigits(stored: string | null | undefined, country: string) {
  const digits = (stored ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const dial = countryDial(country).replace(/\D/g, "");
  if (dial && digits.startsWith(dial) && digits.length > dial.length) {
    return digits.slice(dial.length);
  }
  return digits;
}
