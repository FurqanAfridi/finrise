"use client";

import { useActionState, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import { createTenantAction } from "@/app/actions/ops";
import { BankFields } from "@/components/bank-fields";
import { NativeSelect, TextInput } from "@/components/forms";
import { COUNTRIES, countryDial } from "@/lib/countries";
import type { FormActionState } from "@/lib/form-state";

export function CompanyCreateForm({
  submitLabel = "Create company",
}: {
  submitLabel?: string;
}) {
  const [state, action] = useActionState(createTenantAction, {} as FormActionState);
  const [country, setCountry] = useState("US");
  const dial = useMemo(() => countryDial(country) || "+1", [country]);
  const errors = state.fieldErrors ?? {};

  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 2 }}>
      <TextInput
        name="name"
        label="Company name"
        placeholder="e.g. Acme Inc."
        required
        maxLength={120}
        errorMessage={errors.name}
      />
      <NativeSelect
        name="country"
        label="Country"
        required
        value={country}
        onChange={(event) => setCountry(event.target.value)}
        errorMessage={errors.country}
      >
        {COUNTRIES.map((row) => (
          <option key={row.code} value={row.code}>
            {row.name}
          </option>
        ))}
      </NativeSelect>
      <TextInput
        name="phone"
        label="Phone number"
        placeholder="5551234567"
        required
        kind="phone"
        helperText={errors.phone ? undefined : "Digits only, 7 to 12 digits. The country code is added automatically."}
        errorMessage={errors.phone}
        startAdornment={<InputAdornment position="start">{dial}</InputAdornment>}
      />
      <TextInput
        name="address"
        label="Address"
        placeholder="e.g. 1 Main St"
        required
        maxLength={200}
        errorMessage={errors.address}
      />
      <TextInput
        name="zipCode"
        label="Zip code"
        placeholder="e.g. 94143"
        required
        maxLength={12}
        errorMessage={errors.zipCode}
        sanitize={(value) =>
          country === "US" || country === "IN" || country === "PK" || country === "AU" || country === "DE" || country === "FR"
            ? value.replace(/[^\d-]/g, "")
            : value.toUpperCase().replace(/[^A-Z0-9\s-]/g, "")
        }
      />
      <BankFields key={country} country={country} size="small" fieldErrors={errors} />
      {state.error && !state.fieldErrors ? (
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
