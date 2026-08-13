"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function WizardSteps({
  steps,
  active,
}: {
  steps: string[];
  active: number;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        mb: 3,
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
      }}
      aria-label="Progress"
    >
      {steps.map((label, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <Stack key={label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
                bgcolor: current || done ? "primary.main" : "var(--fr-surface-muted)",
                color: current || done ? "primary.contrastText" : "text.secondary",
                border: "1px solid",
                borderColor: current || done ? "primary.main" : "divider",
              }}
            >
              {index + 1}
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: current ? 700 : 500,
                color: current ? "text.primary" : "text.secondary",
                display: { xs: current ? "block" : "none", sm: "block" },
              }}
            >
              {label}
            </Typography>
            {index < steps.length - 1 ? (
              <Box
                sx={{
                  width: { xs: 12, sm: 24 },
                  height: 2,
                  bgcolor: done ? "primary.main" : "divider",
                  borderRadius: 1,
                  display: { xs: "none", sm: "block" },
                }}
              />
            ) : null}
          </Stack>
        );
      })}
    </Stack>
  );
}
