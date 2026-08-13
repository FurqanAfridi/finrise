import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MainCard } from "@/components/berry/main-card";
import { money } from "@/lib/money";

export function TaxCard({
  profit,
  taxReserve,
  taxRate,
  distributable,
}: {
  profit: number;
  taxReserve: number;
  taxRate: number;
  distributable: number;
}) {
  return (
    <MainCard title="Tax reserve">
      <Stack spacing={1.5}>
        <Row label="Profit" value={money(profit)} />
        <Row label={`Tax reserve (${taxRate}%)`} value={money(taxReserve)} />
        <Row label="Distributable" value={money(distributable)} strong />
      </Stack>
    </MainCard>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant={strong ? "subtitle1" : "body2"}>{value}</Typography>
    </Stack>
  );
}

export function VarianceBadge({ amount, flagged }: { amount: number; flagged: boolean }) {
  if (!flagged && Math.abs(amount) < 0.005) return null;
  return (
    <Chip
      size="small"
      color={flagged ? "error" : "default"}
      variant={flagged ? "filled" : "outlined"}
      label={`${amount >= 0 ? "+" : ""}${money(amount)}`}
    />
  );
}
