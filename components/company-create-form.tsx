"use client";

import { useActionState, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { createTenantAction } from "@/app/actions/ops";
import { BankFields } from "@/components/bank-fields";
import { COUNTRIES, countryDial } from "@/lib/countries";

export function CompanyCreateForm({
  submitLabel = "Create company",
}: {
  submitLabel?: string;
}) {
  const [state, action] = useActionState(createTenantAction, {});
  const [country, setCountry] = useState("US");
  const dial = useMemo(() => countryDial(country) || "+1", [country]);

  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 2 }}>
      <TextField name="name" label="Company name" placeholder="e.g. Acme Inc." size="small" fullWidth required slotProps={{ htmlInput: { maxLength: 120 } }} />
      <TextField
        select
        name="country"
        label="Country"
        size="small"
        fullWidth
        required
        value={country}
        onChange={(event) => setCountry(event.target.value)}
        slotProps={{ select: { native: true } }}
      >
        {COUNTRIES.map((row) => (
          <option key={row.code} value={row.code}>
            {row.name}
          </option>
        ))}
      </TextField>
      <TextField
        name="phone"
        label="Phone number"
        placeholder="5551234567"
        size="small"
        fullWidth
        required
        helperText="Digits only, 7–12 digits. The country code is added automatically."
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start">{dial}</InputAdornment>,
          },
          htmlInput: { inputMode: "numeric", maxLength: 12, autoComplete: "tel-national" },
        }}
        onInput={(event) => {
          const el = event.currentTarget as HTMLInputElement;
          el.value = el.value.replace(/\D/g, "").slice(0, 12);
        }}
      />
      <TextField name="address" label="Address" placeholder="e.g. 1 Main St" size="small" fullWidth required slotProps={{ htmlInput: { maxLength: 200 } }} />
      <TextField
        name="zipCode"
        label="Zip code"
        placeholder="e.g. 94143"
        size="small"
        fullWidth
        required
        slotProps={{
          htmlInput: {
            maxLength: 12,
            inputMode: country === "US" || country === "IN" || country === "PK" ? "numeric" : "text",
            style: { textTransform: "uppercase" },
          },
        }}
        onInput={(event) => {
          const el = event.currentTarget as HTMLInputElement;
          if (country === "US" || country === "IN" || country === "PK" || country === "AU" || country === "DE" || country === "FR") {
            el.value = el.value.replace(/[^\d-]/g, "").slice(0, 12);
          } else {
            el.value = el.value.toUpperCase().replace(/[^A-Z0-9\s-]/g, "").slice(0, 12);
          }
        }}
      />
      <BankFields key={country} country={country} size="small" />
      {state.error ? (
        <Typography color="error" variant="body2">
          {state.error}
        </Typography>
      ) : null}
      <Button type="submit" variant="contained" color="secondary" size="large">
        {submitLabel}
      </Button>
    </Box>
  );
}
