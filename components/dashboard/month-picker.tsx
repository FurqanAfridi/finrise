"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import { NativeSelect } from "@/components/forms";
import { monthName } from "@/lib/utils";

/** How far back the dashboard month list goes. */
const MONTHS_BACK = 24;

/** One dropdown ("All months", "October 2026", …) that switches the dashboard as soon as it changes. */
export function MonthPicker({ selected }: { selected: { year: number; month: number } | null }) {
  const router = useRouter();
  const now = new Date();
  const options: { value: string; label: string }[] = [{ value: "all", label: "All months" }];
  for (let i = 0; i < MONTHS_BACK; i += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    options.push({ value: `${y}-${m}`, label: `${monthName(m)} ${y}` });
  }
  const current = selected ? `${selected.year}-${selected.month}` : "all";
  if (selected && !options.some((option) => option.value === current)) {
    options.splice(1, 0, { value: current, label: `${monthName(selected.month)} ${selected.year}` });
  }

  return (
    <Box sx={{ width: 190 }}>
      <NativeSelect
        label="Month"
        name="month"
        hideLabel
        value={current}
        onChange={(event) => {
          if (event.target.value === "all") {
            router.push("/dashboard?period=all");
            return;
          }
          const [y, m] = event.target.value.split("-");
          router.push(`/dashboard?year=${y}&month=${m}`);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </Box>
  );
}
