"use client";

import { useActionState, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import { signupAction } from "@/app/actions/auth";
import { BankFields } from "@/components/bank-fields";
import { NativeSelect, TextInput } from "@/components/forms";
import { COUNTRIES, countryDial } from "@/lib/countries";
import type { FormActionState } from "@/lib/form-state";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, {} as FormActionState);
  const [country, setCountry] = useState("US");
  const dial = useMemo(() => countryDial(country) || "+1", [country]);
  const errors = state.fieldErrors ?? {};

  return (
    <Box component="form" action={action} sx={{ width: 1, display: "grid", gap: 2, gridTemplateColumns: { sm: "1fr 1fr" } }}>
      <TextInput
        name="firstName"
        label="First name"
        placeholder="e.g. John"
        required
        autoComplete="given-name"
        size="medium"
        kind="letters"
        maxLength={80}
        errorMessage={errors.firstName}
      />
      <TextInput
        name="lastName"
        label="Last name"
        placeholder="e.g. Doe"
        required
        autoComplete="family-name"
        size="medium"
        kind="letters"
        maxLength={80}
        errorMessage={errors.lastName}
      />
      <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
        <TextInput
          name="email"
          type="email"
          label="Email"
          placeholder="e.g. john@acme.com"
          required
          autoComplete="email"
          size="medium"
          maxLength={254}
          errorMessage={errors.email}
        />
      </Box>
      <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
        <TextInput
          name="companyName"
          label="Company name"
          placeholder="e.g. Acme Inc."
          required
          autoComplete="organization"
          size="medium"
          maxLength={120}
          errorMessage={errors.companyName}
        />
      </Box>
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
        autoComplete="tel-national"
        size="medium"
        kind="phone"
        helperText={errors.phone ? undefined : "Digits only, 7 to 12 digits. The country code is added automatically."}
        errorMessage={errors.phone}
        startAdornment={<InputAdornment position="start">{dial}</InputAdornment>}
      />
      <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
        <TextInput
          name="address"
          label="Address"
          placeholder="e.g. 1 Main St"
          required
          autoComplete="street-address"
          size="medium"
          maxLength={200}
          errorMessage={errors.address}
        />
      </Box>
      <TextInput
        name="zipCode"
        label="Zip code"
        placeholder="e.g. 94143"
        required
        autoComplete="postal-code"
        size="medium"
        maxLength={12}
        errorMessage={errors.zipCode}
        sanitize={(value) =>
          country === "US" || country === "IN" || country === "PK" || country === "AU" || country === "DE" || country === "FR"
            ? value.replace(/[^\d-]/g, "")
            : value.toUpperCase().replace(/[^A-Z0-9\s-]/g, "")
        }
      />
      <Box sx={{ display: { xs: "none", sm: "block" } }} />
      <BankFields key={country} country={country} fieldErrors={errors} />
      <TextInput
        name="password"
        type="password"
        label="Create password"
        placeholder="Minimum 8 characters"
        required
        autoComplete="new-password"
        size="medium"
        helperText={errors.password ? undefined : "Minimum 8 characters"}
        errorMessage={errors.password}
      />
      <TextInput
        name="confirmPassword"
        type="password"
        label="Confirm password"
        required
        autoComplete="new-password"
        size="medium"
        errorMessage={errors.confirmPassword}
      />
      {state.error && !state.fieldErrors ? (
        <Typography color="error" variant="body2" sx={{ gridColumn: "1 / -1" }}>
          {state.error}
        </Typography>
      ) : null}
      <Button color="secondary" fullWidth size="large" type="submit" variant="contained" sx={{ gridColumn: "1 / -1" }}>
        Create account
      </Button>
    </Box>
  );
}
