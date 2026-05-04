/**
 * src/components/admin/dashboard/RecentAuditCard.tsx — AD1.1
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminPoll } from "@/lib/use-admin-poll";
import { WidgetCard } from "./WidgetCard";

interface AuditResp {
  ok: boolean;
  events: {
    id: number;
    table_name: string;
    record_id: string;
    action: string;
    changed_by_name: string | null;
    diff: Record<string, unknown> | null;
    created_at: string;
  }[];
}

const FILTERS: { key: string; label: string; hours: number }[] = [
  { key: "1h", label: "Last 1h", hours: 1 },
  { key: "24h", label: "Last 24h", hours: 24 },
  { key: "7d", label: "Last 7d", hours: 24 * 7 },
];

function fmtAction(action: string): string {
  return action
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecentAuditCard() {
  const [filter, setFilter] = useState(FILTERS[1]);
  const poll = useAdminPoll<AuditResp>(
    () =>
      fetch(
        `/api/admin/dashboard/recent-audit?hours=${filter.hours}&limit=10`
      ).then((r) => r.json()),
    60000
  );
  return (
    <WidgetCard
      id="recent-audit"
      title="Recent audit"
      subtitle="Admin + system events"
      span="col-span-12"
      pollResult={poll}
      isEmpty={(d) => d.events.length === 0}
      emptyLabel="No audit events in this window."
    >
      {(d) => (
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f);
                  poll.refetch();
                }}
                className={`rounded-full px-2.5 py-0.5 ${
                  filter.key === f.key
                    ? "bg-ehrc-navy text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
            <Link
              href={"/admin/dashboard?soon=Audit&sprint=AD1.7" as any}
              className="ml-auto text-slate-500 hover:text-ehrc-navy hover:underline"
            >
              View full audit →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-1.5 pr-3 font-normal">When</th>
                <th className="py-1.5 pr-3 font-normal">Actor</th>
                <th className="py-1.5 pr-3 font-normal">Action</th>
                <th className="py-1.5 pr-3 font-normal">Table</th>
                <th className="py-1.5 pr-3 font-normal">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.events.map((e) => (
                <tr key={e.id} className="text-sm">
                  <td className="py-2 pr-3 text-slate-600">{fmtTime(e.created_at)}</td>
                  <td className="py-2 pr-3 text-ehrc-navy">{e.changed_by_name ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-700">{fmtAction(e.action)}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-500">{e.table_name}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-500">{e.record_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
