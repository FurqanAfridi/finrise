"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SETTINGS_TABS } from "@/lib/settings-tabs";

export function SettingsHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash || !SETTINGS_TABS.some((tab) => tab.id === hash)) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === hash) return;
    url.searchParams.set("tab", hash);
    url.hash = "";
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  }, [router]);

  return null;
}
