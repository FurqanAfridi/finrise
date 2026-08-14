"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { TextInput } from "@/components/forms";
import { routingFieldLabel, usesAbaRouting, usesBsb, usesIban } from "@/lib/validation";

export type BankFieldValues = {
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankRoutingNumber?: string | null;
  bankIban?: string | null;
  bankSwift?: string | null;
};

export function BankFields({
  country,
  defaults,
  size = "medium",
  fieldErrors,
}: {
  country: string;
  defaults?: BankFieldValues;
  size?: "small" | "medium";
  fieldErrors?: Record<string, string>;
}) {
  const iban = usesIban(country);
  const localRouting = usesAbaRouting(country) || usesBsb(country);
  const swiftRequired = iban || country === "AU" || (!iban && !localRouting);

  return (
    <Box sx={{ display: "grid", gap: 2, gridColumn: "1 / -1", gridTemplateColumns: { sm: "1fr 1fr" } }}>
      <Typography variant="subtitle2" sx={{ gridColumn: "1 / -1" }}>
        Company bank account
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1", mt: -1.5 }}>
        Use a real account. Account numbers are digits only. Routing numbers are 8 or 9 digits. IBAN and SWIFT are checked for the selected country.
      </Typography>
      <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
        <TextInput
          name="bankName"
          label="Bank name"
          placeholder="e.g. Chase, HSBC, HBL"
          required
          size={size}
          defaultValue={defaults?.bankName ?? ""}
          maxLength={80}
          errorMessage={fieldErrors?.bankName}
        />
      </Box>
      {localRouting ? (
        <TextInput
          name="bankRoutingNumber"
          label={routingFieldLabel(country)}
          placeholder={usesAbaRouting(country) ? "8 or 9 digits" : "6 digits"}
          required
          size={size}
          defaultValue={defaults?.bankRoutingNumber ?? ""}
          maxLength={usesAbaRouting(country) ? 9 : 6}
          errorMessage={fieldErrors?.bankRoutingNumber}
          sanitize={(value) => value.replace(/\D/g, "")}
        />
      ) : null}
      {iban ? (
        <TextInput
          name="bankIban"
          label="IBAN"
          placeholder="e.g. GB82WEST12345698765432"
          required
          size={size}
          defaultValue={defaults?.bankIban ?? ""}
          helperText={fieldErrors?.bankIban ? undefined : "Country code + check digits + account. Spaces are OK."}
          maxLength={34}
          errorMessage={fieldErrors?.bankIban}
          sanitize={(value) => value.toUpperCase().replace(/[^A-Z0-9\s]/g, "")}
        />
      ) : null}
      <TextInput
        name="bankAccountNumber"
        label={iban ? "Account number (optional)" : "Account number"}
        placeholder="Digits only"
        required={!iban}
        size={size}
        defaultValue={defaults?.bankAccountNumber ?? ""}
        maxLength={34}
        errorMessage={fieldErrors?.bankAccountNumber}
        sanitize={(value) => value.replace(/\D/g, "")}
      />
      <TextInput
        name="bankSwift"
        label={swiftRequired ? "SWIFT / BIC" : "SWIFT / BIC (optional)"}
        placeholder="e.g. CHASUS33"
        required={swiftRequired}
        size={size}
        defaultValue={defaults?.bankSwift ?? ""}
        helperText={fieldErrors?.bankSwift ? undefined : "8 or 11 characters, e.g. CHASUS33XXX"}
        maxLength={11}
          errorMessage={fieldErrors?.bankSwift}
          sanitize={(value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "")}
        />
    </Box>
  );
}
