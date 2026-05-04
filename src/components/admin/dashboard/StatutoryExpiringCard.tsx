/**
 * src/components/admin/dashboard/StatutoryExpiringCard.tsx — AD1.1
 */

"use client";

import Link from "next/link";
import { useAdminPoll } from "@/lib/use-admin-poll";
import { WidgetCard } from "./WidgetCard";

interface StatutoryResp {
  ok: boolean;
  items: {
    id: number;
    licence_id: string | null;
    item: string;
    current_expiry: string;
    days_remaining: number;
  }[];
}

function tierColor(daysRemaining: number): string {
  if (daysRemaining <= 0) return "text-red-600";
  if (daysRemaining < 7) return "text-red-600";
  if (daysRemaining < 30) return "text-amber-600";
  return "text-slate-600";
}

export function StatutoryExpiringCard() {
  const poll = useAdminPoll<StatutoryResp>(
    () => fetch("/api/admin/dashboard/statutory-expiring").then((r) => r.json()),
    60 * 60 * 1000
  );
  return (
    <WidgetCard
      id="statutory-expiring"
      title="Statutory ≤ 30 days"
      subtitle="Renewals approaching"
      span="col-span-12 md:col-span-6 lg:col-span-3"
      pollResult={poll}
      isEmpty={(d) => d.items.length === 0}
      emptyLabel="Nothing expiring in the next 30 days."
    >
      {(d) => (
        <ul className="space-y-1.5 text-sm">
          {d.items.slice(0, 6).map((s) => (
            <li key={s.id} className="flex items-baseline justify-between gap-2">
              <Link
                href={"/admin/statutory" as any}
                className="truncate text-slate-700 hover:underline"
                title={s.item}
              >
                {s.licence_id ?? "—"} · {s.item}
              </Link>
              <span className={`shrink-0 text-xs font-medium ${tierColor(s.days_remaining)}`}>
                {s.days_remaining <= 0
                  ? `expired ${Math.abs(s.days_remaining)}d`
                  : `${s.days_remaining}d`}
              </span>
            </li>
          ))}
          {d.items.length > 6 && (
            <li className="pt-1 text-xs text-slate-500">+{d.items.length - 6} more</li>
          )}
        </ul>
      )}
    </WidgetCard>
  );
}
