/**
 * src/components/admin/dashboard/UpdatedAgoChip.tsx — AD1.1
 *
 * Reads earliestFetched from the refresh bus, ticks display every 10s.
 */

"use client";

import { useEffect, useState } from "react";
import { useDashboardRefresh } from "./refresh-context";

function formatAgo(ms: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export function UpdatedAgoChip() {
  const { earliestFetched } = useDashboardRefresh();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  if (earliestFetched == null) return null;

  return (
    <div className="hidden text-xs text-slate-500 lg:block" aria-live="polite">
      Updated {formatAgo(earliestFetched)}
    </div>
  );
}
