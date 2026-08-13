"use client";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
}: {
  country: string;
  defaults?: BankFieldValues;
  size?: "small" | "medium";
}) {
  const iban = usesIban(country);
  const localRouting = usesAbaRouting(country) || usesBsb(country);

  return (
    <Box sx={{ display: "grid", gap: 2, gridColumn: "1 / -1", gridTemplateColumns: { sm: "1fr 1fr" } }}>
      <Typography variant="subtitle2" sx={{ gridColumn: "1 / -1" }}>
        Company bank account
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1", mt: -1.5 }}>
        Use a real account. Account and routing numbers must be digits. IBAN and SWIFT are checked for the selected country.
      </Typography>
      <TextField
        name="bankName"
        label="Bank name"
        placeholder="e.g. Chase, HSBC, HBL"
        fullWidth
        required
        size={size}
        defaultValue={defaults?.bankName ?? ""}
        sx={{ gridColumn: { sm: "1 / -1" } }}
        slotProps={{ htmlInput: { maxLength: 80 } }}
      />
      {localRouting ? (
        <TextField
          name="bankRoutingNumber"
          label={routingFieldLabel(country)}
          placeholder={usesAbaRouting(country) ? "9 digits" : "6 digits"}
          fullWidth
          required
          size={size}
          defaultValue={defaults?.bankRoutingNumber ?? ""}
          slotProps={{
            htmlInput: {
              inputMode: "numeric",
              autoComplete: "off",
              maxLength: usesAbaRouting(country) ? 9 : 6,
            },
          }}
          onInput={(event) => {
            const el = event.currentTarget as HTMLInputElement;
            const max = usesAbaRouting(country) ? 9 : 6;
            el.value = el.value.replace(/\D/g, "").slice(0, max);
          }}
        />
      ) : null}
      {iban ? (
        <TextField
          name="bankIban"
          label="IBAN"
          placeholder="e.g. GB82WEST12345698765432"
          fullWidth
          required
          size={size}
          defaultValue={defaults?.bankIban ?? ""}
          helperText="Country code + check digits + account. Spaces are OK."
          slotProps={{ htmlInput: { autoComplete: "off", maxLength: 34, style: { textTransform: "uppercase" } } }}
          onInput={(event) => {
            const el = event.currentTarget as HTMLInputElement;
            el.value = el.value.toUpperCase().replace(/[^A-Z0-9\s]/g, "").slice(0, 42);
          }}
        />
      ) : null}
      {!iban ? (
        <TextField
          name="bankAccountNumber"
          label="Account number"
          placeholder="Digits only"
          fullWidth
          required
          size={size}
          defaultValue={defaults?.bankAccountNumber ?? ""}
          slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "off", maxLength: 34 } }}
          onInput={(event) => {
            const el = event.currentTarget as HTMLInputElement;
            el.value = el.value.replace(/\D/g, "").slice(0, 34);
          }}
        />
      ) : (
        <TextField
          name="bankAccountNumber"
          label="Account number (optional)"
          placeholder="Digits only"
          fullWidth
          size={size}
          defaultValue={defaults?.bankAccountNumber ?? ""}
          slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "off", maxLength: 34 } }}
          onInput={(event) => {
            const el = event.currentTarget as HTMLInputElement;
            el.value = el.value.replace(/\D/g, "").slice(0, 34);
          }}
        />
      )}
      <TextField
        name="bankSwift"
        label={iban || country === "AU" || (!iban && !localRouting) ? "SWIFT / BIC" : "SWIFT / BIC (optional)"}
        placeholder="e.g. CHASUS33"
        fullWidth
        required={iban || country === "AU" || (!iban && !localRouting)}
        size={size}
        defaultValue={defaults?.bankSwift ?? ""}
        helperText="8 or 11 characters, e.g. CHASUS33XXX"
        slotProps={{ htmlInput: { autoComplete: "off", maxLength: 11, style: { textTransform: "uppercase" } } }}
        onInput={(event) => {
          const el = event.currentTarget as HTMLInputElement;
          el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
        }}
      />
    </Box>
  );
}
