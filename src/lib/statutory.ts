/**
 * src/lib/statutory.ts — Compute days-to-expiry tiers per PRD §3.3.
 */

import { todayInIST } from "./engine";

export type StatutoryTier = "critical" | "red" | "orange" | "yellow" | "silent";

export function tierForExpiry(currentExpiry: string | null | Date): {
  tier: StatutoryTier;
  days: number | null;
} {
  if (!currentExpiry) return { tier: "silent", days: null };
  const today = todayInIST();
  const expiryStr =
    currentExpiry instanceof Date
      ? currentExpiry.toISOString().slice(0, 10)
      : String(currentExpiry).slice(0, 10);
  const t = new Date(today + "T00:00:00Z").getTime();
  const e = new Date(expiryStr + "T00:00:00Z").getTime();
  const days = Math.floor((e - t) / 86400_000);
  if (days < 0) return { tier: "critical", days };
  if (days <= 30) return { tier: "red", days };
  if (days <= 90) return { tier: "orange", days };
  if (days <= 180) return { tier: "yellow", days };
  return { tier: "silent", days };
}

export function isUrgent(tier: StatutoryTier): boolean {
  return tier === "red" || tier === "critical";
}
