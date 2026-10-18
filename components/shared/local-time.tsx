"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** "Oct 18, 2026, 3:42 PM" in the viewer's own time zone; UTC on the server render. */
export function LocalTime({ iso }: { iso: string }) {
  const zone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
  const text = new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  });
  return <time dateTime={iso}>{text}</time>;
}
