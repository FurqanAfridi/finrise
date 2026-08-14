import { COUNTRIES, countryDial } from "@/lib/countries";

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string; field?: string };

function ok<T>(value: T): FieldResult<T> {
  return { ok: true, value };
}

function err(error: string, field?: string): FieldResult<never> {
  return field ? { ok: false, error, field } : { ok: false, error };
}

export function tagged<T>(field: string, result: FieldResult<T>): FieldResult<T> {
  if (result.ok) return result;
  return { ok: false, error: result.error, field };
}

const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;
const PERSON_NAME_RE = /^[\p{L}][\p{L}\s'.-]{0,79}$/u;
const COMPANY_NAME_RE = /^[\p{L}0-9][\p{L}0-9\s.&'"()\/-]{1,119}$/u;
const SWIFT_RE = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const IBAN_COUNTRIES = new Set([
  "GB", "DE", "FR", "NL", "IE", "ES", "IT", "PT", "SE", "NO", "DK", "PL", "AE", "PK", "SA", "BH", "QA", "KW", "TR",
]);

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function hasLetters(value: string) {
  return /[A-Za-z\p{L}]/u.test(value);
}

export function parsePersonName(value: string, label: string): FieldResult<string> {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return err(`${label} is required.`);
  if (/\d/.test(name)) return err(`${label} cannot contain numbers.`);
  if (!PERSON_NAME_RE.test(name)) return err(`Enter a valid ${label.toLowerCase()}.`);
  return ok(name);
}

export function parseEmail(value: string, required = true): FieldResult<string | null> {
  const email = value.trim().toLowerCase();
  if (!email) return required ? err("Email is required.") : ok(null);
  if (!EMAIL_RE.test(email)) return err("Enter a valid email address.");
  return ok(email);
}

export function parseCompanyName(value: string): FieldResult<string> {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return err("Company name is required.");
  if (/^\d+$/.test(name)) return err("Company name cannot be only numbers.");
  if (!COMPANY_NAME_RE.test(name)) return err("Enter a valid company name.");
  return ok(name);
}

export function parseCountry(value: string): FieldResult<string> {
  const code = value.trim().toUpperCase();
  if (!COUNTRIES.some((row) => row.code === code)) return err("Choose a valid country.");
  return ok(code);
}

export function parsePhone(local: string, country: string): FieldResult<string> {
  const countryResult = parseCountry(country);
  if (!countryResult.ok) return countryResult;
  const raw = local.trim();
  if (!raw) return err("Phone number is required.");
  if (hasLetters(raw)) return err("Phone number cannot contain letters.");
  const dialDigits = countryDial(countryResult.value).replace(/\D/g, "");
  let national = digitsOnly(raw);
  if (!national) return err("Phone number must contain digits.");
  if (national.startsWith("00")) national = national.slice(2);
  if (national.startsWith(dialDigits) && national.length > dialDigits.length + 6) {
    national = national.slice(dialDigits.length);
  }
  if (national.length < 7 || national.length > 12) {
    return err("Phone number must be 7 to 12 digits (without country code).");
  }
  return ok(`+${dialDigits}${national}`);
}

export function parseOptionalPhone(local: string, country: string): FieldResult<string | null> {
  if (!local.trim()) return ok(null);
  return parsePhone(local, country);
}

export function parseZipCode(value: string, country: string): FieldResult<string> {
  const zip = value.trim().toUpperCase();
  if (!zip) return err("Zip code is required.");
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/,
    GB: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/,
    AU: /^\d{4}$/,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    IN: /^\d{6}$/,
    PK: /^\d{5}$/,
    NL: /^\d{4}\s?[A-Z]{2}$/,
    AE: /^\d{3,6}$/,
  };
  const pattern = patterns[country] ?? /^[A-Z0-9][A-Z0-9\s-]{2,11}$/;
  if (["US", "AU", "DE", "FR", "IN", "PK", "AE"].includes(country) && hasLetters(zip.replace("-", ""))) {
    return err("Zip code cannot contain letters for the selected country.");
  }
  if (!pattern.test(zip)) return err("Enter a valid zip / postal code for the selected country.");
  return ok(zip);
}

export function parseAddress(value: string): FieldResult<string> {
  const address = value.trim().replace(/\s+/g, " ");
  if (!address) return err("Address is required.");
  if (address.length < 5) return err("Enter a full street address.");
  if (!/\d/.test(address) || !/[A-Za-z\p{L}]/u.test(address)) {
    return err("Address should include a street number and name.");
  }
  return ok(address);
}

export function parseOptionalPersonName(value: string, label: string): FieldResult<string | null> {
  if (!value.trim()) return ok(null);
  return parsePersonName(value, label);
}

export function parseFormDate(value: string, label: string, required = false): FieldResult<Date | null> {
  const raw = value.trim();
  if (!raw) return required ? err(`${label} is required.`) : ok(null);
  const iso = raw.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return err(`Enter a valid ${label.toLowerCase()} (YYYY-MM-DD).`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1990 || year > 2100) return err(`${label} must be between 1990 and 2100.`);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return err(`Enter a valid ${label.toLowerCase()}.`);
  }
  return ok(date);
}

export function parsePassword(password: string, confirm?: string): FieldResult<string> {
  if (password.length < 8) return err("Password must be at least 8 characters.");
  if (confirm !== undefined && password !== confirm) return err("Passwords do not match.");
  return ok(password);
}

export function parseOptionalText(
  value: string,
  label: string,
  maxLength: number,
): FieldResult<string | null> {
  const raw = value.trim().replace(/\s+/g, " ");
  if (!raw) return ok(null);
  if (raw.length > maxLength) return err(`${label} must be ${maxLength} characters or less.`);
  return ok(raw);
}

export function parseCurrencyCode(value: string, required = true): FieldResult<string | null> {
  const code = value.trim().toUpperCase();
  if (!code) return required ? err("Currency is required.") : ok(null);
  if (!/^[A-Z]{3}$/.test(code)) return err("Currency must be a 3-letter code, e.g. USD.");
  return ok(code);
}

export function parseCurrency(value: string): FieldResult<string> {
  const result = parseCurrencyCode(value, true);
  if (!result.ok) return result;
  return ok(result.value!);
}

export function parsePercent(
  value: string,
  label: string,
  min = 0,
  max = 100,
): FieldResult<number> {
  const result = parseMoney(value, label, true);
  if (!result.ok) return result;
  if (result.value == null || result.value < min || result.value > max) {
    return err(`${label} must be between ${min} and ${max}.`);
  }
  return ok(result.value);
}

/** Equity / partner share: 1–100 inclusive. */
export function parseSharePercent(value: string, label = "Share percent"): FieldResult<number> {
  return parsePercent(value, label, 1, 100);
}

export function parseTaxId(value: string): FieldResult<string | null> {
  const raw = value.trim();
  if (!raw) return ok(null);
  if (raw.length < 5 || raw.length > 20) return err("Enter a valid tax ID (5 to 20 characters).");
  if (!/^[A-Za-z0-9-]+$/.test(raw)) return err("Tax ID can only contain letters, numbers, and hyphens.");
  return ok(raw);
}

export function formField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function parseMoney(value: string, label: string, required = true): FieldResult<number | null> {
  const raw = value.trim();
  if (!raw) return required ? err(`${label} is required.`) : ok(null);
  if (hasLetters(raw)) return err(`${label} cannot contain letters.`);
  if (!/^\d+(\.\d{1,4})?$/.test(raw)) return err(`Enter a valid ${label.toLowerCase()}.`);
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return err(`Enter a valid ${label.toLowerCase()}.`);
  return ok(amount);
}

export function parsePositiveMoney(value: string, label: string): FieldResult<number> {
  const result = parseMoney(value, label, true);
  if (!result.ok) return result;
  if (result.value == null || result.value <= 0) return err(`${label} must be greater than 0.`);
  return ok(result.value);
}

export function parseInteger(value: string, label: string, min: number, max: number, required = true): FieldResult<number | null> {
  const raw = value.trim();
  if (!raw) return required ? err(`${label} is required.`) : ok(null);
  if (hasLetters(raw) || !/^-?\d+$/.test(raw)) return err(`${label} must be a whole number.`);
  const n = Number(raw);
  if (n < min || n > max) return err(`${label} must be between ${min} and ${max}.`);
  return ok(n);
}

export const DEFAULT_INVOICE_COLOR = "#5E35B1";

export function parseHexColor(value: string, fallback = DEFAULT_INVOICE_COLOR): FieldResult<string> {
  const raw = value.trim();
  if (!raw) return ok(fallback);
  const hex = (raw.startsWith("#") ? raw : `#${raw}`).toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(hex)) return err("Invoice color must be a 6-digit hex code, e.g. #5E35B1.");
  return ok(hex);
}

export function parseTermsAndConditions(value: string): FieldResult<string | null> {
  const raw = value.trim();
  if (!raw) return ok(null);
  if (raw.length > 8000) return err("Terms and conditions must be 8,000 characters or less.");
  return ok(raw);
}

export function parseWebsite(value: string): FieldResult<string | null> {
  const raw = value.trim();
  if (!raw) return ok(null);
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(url.protocol)) return err("Enter a valid website URL.");
    return ok(url.toString());
  } catch {
    return err("Enter a valid website URL.");
  }
}

export function parseBankName(value: string): FieldResult<string> {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return err("Bank name is required.");
  if (/\d/.test(name) && !/[A-Za-z\p{L}]/u.test(name)) return err("Bank name cannot be only numbers.");
  if (name.length < 3) return err("Enter the full bank name.");
  return ok(name);
}

export function parseAccountNumber(value: string): FieldResult<string> {
  const raw = value.trim();
  if (!raw) return err("Account number is required.");
  if (hasLetters(raw)) return err("Account number cannot contain letters.");
  const digits = digitsOnly(raw);
  if (digits.length < 6 || digits.length > 18) return err("Enter a valid bank account number (6 to 18 digits).");
  return ok(digits);
}

export function parseBsb(value: string): FieldResult<string> {
  const raw = value.trim();
  if (!raw) return err("BSB is required for Australian accounts.");
  if (hasLetters(raw)) return err("BSB cannot contain letters.");
  const digits = digitsOnly(raw);
  if (digits.length !== 6) return err("Australian BSB must be 6 digits.");
  return ok(digits);
}

export function parseAbaRouting(value: string): FieldResult<string> {
  const raw = value.trim();
  if (!raw) return err("Routing number is required for US accounts.");
  if (hasLetters(raw)) return err("Routing number cannot contain letters.");
  const digits = digitsOnly(raw);
  if (digits.length !== 8 && digits.length !== 9) {
    return err("Routing number must be 8 or 9 digits.");
  }
  if (digits.length === 9) {
    const d = digits.split("").map(Number);
    const checksum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
    if (checksum % 10 !== 0) return err("Enter a valid US routing number.");
  }
  return ok(digits);
}

export function parseIban(value: string): FieldResult<string> {
  const iban = value.replace(/\s+/g, "").toUpperCase();
  if (!iban) return err("IBAN is required for this country.");
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return err("Enter a valid IBAN.");
  const expanded = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of expanded) remainder = (remainder * 10 + Number(ch)) % 97;
  if (remainder !== 1) return err("Enter a valid IBAN. The check digits do not match.");
  return ok(iban);
}

export function parseSwift(value: string, required = false): FieldResult<string | null> {
  const swift = value.trim().toUpperCase();
  if (!swift) return required ? err("SWIFT / BIC is required.") : ok(null);
  if (!SWIFT_RE.test(swift)) return err("Enter a valid SWIFT/BIC (8 or 11 characters, e.g. CHASUS33).");
  return ok(swift);
}

export function parseBankDetails(input: {
  country: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  iban: string;
  swift: string;
}): FieldResult<{
  bankName: string;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankIban: string | null;
  bankSwift: string | null;
  bankDetails: string;
}> {
  const name = tagged("bankName", parseBankName(input.bankName));
  if (!name.ok) return name;

  const country = input.country.toUpperCase();
  let accountNumber: string | null = null;
  let routingNumber: string | null = null;
  let iban: string | null = null;
  let swift: string | null = null;

  if (country === "US") {
    const routing = tagged("bankRoutingNumber", parseAbaRouting(input.routingNumber));
    if (!routing.ok) return routing;
    const account = tagged("bankAccountNumber", parseAccountNumber(input.accountNumber));
    if (!account.ok) return account;
    routingNumber = routing.value;
    accountNumber = account.value;
    const swiftResult = tagged("bankSwift", parseSwift(input.swift, false));
    if (!swiftResult.ok) return swiftResult;
    swift = swiftResult.value;
  } else if (country === "AU") {
    const bsb = tagged("bankRoutingNumber", parseBsb(input.routingNumber));
    if (!bsb.ok) return bsb;
    const account = tagged("bankAccountNumber", parseAccountNumber(input.accountNumber));
    if (!account.ok) return account;
    routingNumber = bsb.value;
    accountNumber = account.value;
    const swiftResult = tagged("bankSwift", parseSwift(input.swift, true));
    if (!swiftResult.ok) return swiftResult;
    swift = swiftResult.value;
  } else if (IBAN_COUNTRIES.has(country)) {
    const ibanResult = tagged("bankIban", parseIban(input.iban));
    if (!ibanResult.ok) return ibanResult;
    iban = ibanResult.value;
    const swiftResult = tagged("bankSwift", parseSwift(input.swift, true));
    if (!swiftResult.ok) return swiftResult;
    swift = swiftResult.value;
    if (input.accountNumber.trim()) {
      const account = tagged("bankAccountNumber", parseAccountNumber(input.accountNumber));
      if (!account.ok) return account;
      accountNumber = account.value;
    }
  } else {
    const account = tagged("bankAccountNumber", parseAccountNumber(input.accountNumber));
    if (!account.ok) return account;
    accountNumber = account.value;
    const swiftResult = tagged("bankSwift", parseSwift(input.swift, true));
    if (!swiftResult.ok) return swiftResult;
    swift = swiftResult.value;
  }

  const lines = [
    accountNumber ? `Account: ${accountNumber}` : null,
    routingNumber ? `${country === "AU" ? "BSB" : "Routing"}: ${routingNumber}` : null,
    iban ? `IBAN: ${iban}` : null,
    swift ? `SWIFT/BIC: ${swift}` : null,
  ].filter(Boolean);

  return ok({
    bankName: name.value,
    bankAccountNumber: accountNumber,
    bankRoutingNumber: routingNumber,
    bankIban: iban,
    bankSwift: swift,
    bankDetails: lines.join("\n"),
  });
}

export function usesIban(country: string) {
  return IBAN_COUNTRIES.has(country.toUpperCase());
}

export function usesAbaRouting(country: string) {
  return country.toUpperCase() === "US";
}

export function usesBsb(country: string) {
  return country.toUpperCase() === "AU";
}

export function routingFieldLabel(country: string) {
  if (usesAbaRouting(country)) return "Routing number (ABA)";
  if (usesBsb(country)) return "BSB";
  return "Routing number";
}

export function parseBankFromForm(formData: FormData, country: string) {
  return parseBankDetails({
    country,
    bankName: formField(formData, "bankName"),
    accountNumber: formField(formData, "bankAccountNumber"),
    routingNumber: formField(formData, "bankRoutingNumber"),
    iban: formField(formData, "bankIban"),
    swift: formField(formData, "bankSwift"),
  });
}

export function parseCompanyIdentity(input: {
  name: string;
  country: string;
  phone: string;
  address: string;
  zipCode: string;
  email?: string;
  bankName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankIban: string;
  bankSwift: string;
}) {
  const name = tagged("name", parseCompanyName(input.name));
  if (!name.ok) return name;
  const country = tagged("country", parseCountry(input.country));
  if (!country.ok) return country;
  const phone = tagged("phone", parsePhone(input.phone, country.value));
  if (!phone.ok) return phone;
  const address = tagged("address", parseAddress(input.address));
  if (!address.ok) return address;
  const zip = tagged("zipCode", parseZipCode(input.zipCode, country.value));
  if (!zip.ok) return zip;
  let email: string | null = null;
  if (input.email?.trim()) {
    const parsed = tagged("email", parseEmail(input.email, true));
    if (!parsed.ok) return parsed;
    email = parsed.value;
  }
  const bank = parseBankDetails({
    country: country.value,
    bankName: input.bankName,
    accountNumber: input.bankAccountNumber,
    routingNumber: input.bankRoutingNumber,
    iban: input.bankIban,
    swift: input.bankSwift,
  });
  if (!bank.ok) return bank;
  return ok({
    name: name.value,
    country: country.value,
    phone: phone.value,
    address: address.value,
    zipCode: zip.value,
    email,
    bank: bank.value,
  });
}
