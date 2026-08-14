import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { POWERED_BY, POWERED_BY_URL } from "@/lib/brand";

export function PoweredBy({ compact = false }: { compact?: boolean }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ textAlign: "center", display: "block", lineHeight: 1.5 }}
    >
      {compact ? null : (
        <Box component="span" sx={{ display: "block", mb: 0.25 }}>
          FundLookup
        </Box>
      )}
      Powered by{" "}
      <Box
        component="a"
        href={POWERED_BY_URL}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}
      >
        {POWERED_BY}
      </Box>
    </Typography>
  );
}
