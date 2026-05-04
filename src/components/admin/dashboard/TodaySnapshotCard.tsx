/**
 * src/components/admin/dashboard/TodaySnapshotCard.tsx — AD1.1
 *
 * Today's task counts by status, with a stacked horizontal bar visualization.
 */

"use client";

import { useAdminPoll } from "@/lib/use-admin-poll";
import { WidgetCard } from "./WidgetCard";

interface Snapshot {
  ok: boolean;
  total: number;
  pending: number;
  claimed: number;
  done: number;
  skipped: number;
  overdue: number;
}

const SEGMENTS: { key: keyof Snapshot; label: string; color: string }[] = [
  { key: "done", label: "Done", color: "bg-emerald-500" },
  { key: "claimed", label: "Claimed", color: "bg-ehrc-blue" },
  { key: "pending", label: "Pending", color: "bg-slate-300" },
  { key: "overdue", label: "Overdue", color: "bg-red-500" },
  { key: "skipped", label: "Skipped", color: "bg-amber-400" },
];

export function TodaySnapshotCard() {
  const poll = useAdminPoll<Snapshot>(
    () => fetch("/api/admin/dashboard/today-snapshot").then((r) => r.json()),
    60000
  );
  return (
    <WidgetCard
      id="today-snapshot"
      title="Today"
      subtitle="Tasks scheduled for today"
      span="col-span-12 md:col-span-6 lg:col-span-3"
      pollResult={poll}
      isEmpty={(d) => d.total === 0}
      emptyLabel="No tasks scheduled for today."
    >
      {(d) => (
        <div>
          <div className="mb-3 flex items-baseline gap-2">
            <div className="text-3xl font-bold text-ehrc-navy">{d.total}</div>
            <div className="text-xs text-slate-500">tasks</div>
          </div>
          <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
            {SEGMENTS.map((s) => {
              const v = (d[s.key] as number) || 0;
              if (v === 0) return null;
              const w = (v / Math.max(d.total, 1)) * 100;
              return (
                <div
                  key={s.key}
                  className={s.color}
                  style={{ width: `${w}%` }}
                  aria-label={`${s.label}: ${v}`}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {SEGMENTS.map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className={`h-2 w-2 rounded-sm ${s.color}`} />
                  {s.label}
                </span>
                <span className="font-medium text-ehrc-navy">{d[s.key] as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
