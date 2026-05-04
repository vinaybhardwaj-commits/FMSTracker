/**
 * src/components/admin/BoundTasksPanel.tsx — AD1.4
 *
 * Sticky right rail showing task templates that reference this entity
 * (location_or_asset matches, or amc_vendor_id matches). Click row → template
 * edit page.
 */

"use client";

import Link from "next/link";
import { useAdminPoll } from "@/lib/use-admin-poll";

interface BoundTask {
  id: number;
  task_id: string | null;
  system: string;
  task_name: string;
  cadence: string;
  active: boolean;
  in_flight_count: number;
}

interface Props {
  endpointPath: string; // e.g. /api/admin/locations/[id]/bound-tasks
  entityLabel: string;
}

export function BoundTasksPanel({ endpointPath, entityLabel }: Props) {
  const poll = useAdminPoll<{ ok: boolean; tasks: BoundTask[] }>(
    () => fetch(endpointPath).then((r) => r.json()),
    5 * 60 * 1000
  );
  const tasks = poll.data?.tasks ?? [];

  return (
    <aside className="sticky top-20 self-start">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="text-sm font-semibold text-ehrc-navy">Bound tasks</div>
            <div className="text-xs text-slate-500">Templates referencing this {entityLabel}</div>
          </div>
          {poll.isFetching && tasks.length > 0 && (
            <div className="text-[10px] uppercase text-slate-400">updating…</div>
          )}
        </div>

        {!poll.data && !poll.error && (
          <div className="space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        )}

        {poll.data && tasks.length === 0 && (
          <div className="py-4 text-center text-xs text-slate-500">
            No task templates reference this {entityLabel}.
          </div>
        )}

        {tasks.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {tasks.slice(0, 10).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/tasks/${t.id}` as any}
                  className="block py-2 hover:bg-slate-50 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-500">{t.task_id ?? "—"}</span>
                    <span className="font-mono text-[10px] text-slate-400">{t.system}</span>
                  </div>
                  <div className="truncate text-sm text-ehrc-navy">{t.task_name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{t.cadence}</span>
                    {t.in_flight_count > 0 && (
                      <span className="text-ehrc-blue">· {t.in_flight_count} in-flight</span>
                    )}
                    {!t.active && <span className="text-slate-400">· inactive</span>}
                  </div>
                </Link>
              </li>
            ))}
            {tasks.length > 10 && (
              <li className="pt-2 text-xs text-slate-500">+{tasks.length - 10} more</li>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
}
