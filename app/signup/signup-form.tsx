"use client";

import { useActionState, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { signupAction } from "@/app/actions/auth";
import { BankFields } from "@/components/bank-fields";
import { COUNTRIES, countryDial } from "@/lib/countries";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, {});
  const [country, setCountry] = useState("US");
  const dial = useMemo(() => countryDial(country) || "+1", [country]);

  return (
    <Box component="form" action={action} sx={{ width: 1, display: "grid", gap: 2, gridTemplateColumns: { sm: "1fr 1fr" } }}>
      <TextField
        name="firstName"
        label="First name"
        placeholder="e.g. John"
        fullWidth
        required
        autoComplete="given-name"
        slotProps={{ htmlInput: { maxLength: 80 } }}
        onInput={(event) => {
          const el = event.currentTarget as HTMLInputElement;
          el.value = el.value.replace(/[^\p{L}\s'.-]/gu, "").replace(/\s+/g, " ");
        }}
      />
      <TextField
        name="lastName"
        label="Last name"
        placeholder="e.g. Doe"
        fullWidth
        required
        autoComplete="family-name"
        slotProps={{ htmlInput: { maxLength: 80 } }}
        onInput={(event) => {
          const el = event.currentTarget as HTMLInputElement;
          el.value = el.value.replace(/[^\p{L}\s'.-]/gu, "").replace(/\s+/g, " ");
        }}
      />
      <TextField
        name="email"
        type="email"
        label="Email"
        placeholder="e.g. john@acme.com"
        fullWidth
        required
        autoComplete="email"
        sx={{ gridColumn: { sm: "1 / -1" } }}
        slotProps={{ htmlInput: { maxLength: 254 } }}
      />
      <TextField
        name="companyName"
        label="Company name"
        placeholder="e.g. Acme Inc."
        fullWidth
        required
        autoComplete="organization"
        sx={{ gridColumn: { sm: "1 / -1" } }}
        slotProps={{ htmlInput: { maxLength: 120 } }}
      />
      <TextField
        select
        name="country"
        label="Country"
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
        fullWidth
        required
        autoComplete="tel-national"
        helperText="Digits only, 7–12 digits. The country code is added automatically."
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start">{dial}</InputAdornment>,
          },
          htmlInput: { inputMode: "numeric", maxLength: 12 },
        }}
        onInput={(event) => {
          const el = event.currentTarget as HTMLInputElement;
          el.value = el.value.replace(/\D/g, "").slice(0, 12);
        }}
      />
      <TextField
        name="address"
        label="Address"
        placeholder="e.g. 1 Main St"
        fullWidth
        required
        autoComplete="street-address"
        sx={{ gridColumn: { sm: "1 / -1" } }}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />
      <TextField
        name="zipCode"
        label="Zip code"
        placeholder="e.g. 94143"
        fullWidth
        required
        autoComplete="postal-code"
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
      <Box sx={{ display: { xs: "none", sm: "block" } }} />
      <BankFields key={country} country={country} />
      <TextField
        name="password"
        type="password"
        label="Create password"
        placeholder="Minimum 8 characters"
        fullWidth
        required
        autoComplete="new-password"
        helperText="Minimum 8 characters"
        slotProps={{ htmlInput: { minLength: 8 } }}
      />
      <TextField
        name="confirmPassword"
        type="password"
        label="Confirm password"
        fullWidth
        required
        autoComplete="new-password"
        slotProps={{ htmlInput: { minLength: 8 } }}
      />
      {state.error ? (
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
