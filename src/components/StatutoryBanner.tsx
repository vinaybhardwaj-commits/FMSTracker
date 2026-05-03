/**
 * src/components/StatutoryBanner.tsx — pinned red banner for urgent statutory.
 *
 * Subtle slow pulse for CRITICAL (expired). No flashing (NABH photosensitivity).
 * Multiple urgent items rotate on a 5s cycle.
 */

"use client";

import { useEffect, useState } from "react";

export interface StatutoryUrgent {
  id: number;
  licence_id: string | null;
  item: string;
  current_expiry: string | null;
  tier: "red" | "critical" | string;
  days: number | null;
}

export function StatutoryBanner({ items }: { items: StatutoryUrgent[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items || items.length === 0) return null;
  const item = items[idx % items.length];
  const isCritical = item.tier === "critical";

  const text = isCritical
    ? `⛔ ${item.item} EXPIRED · Renew now`
    : `⚠ ${item.item} expires in ${item.days} day${item.days === 1 ? "" : "s"} · Tap to act`;

  return (
    <div
      className={`flex h-16 w-full items-center justify-center bg-red-600 px-4 text-center text-sm font-medium text-white ${isCritical ? "animate-pulse-slow" : ""}`}
      aria-live="polite"
      role="status"
    >
      {text}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
