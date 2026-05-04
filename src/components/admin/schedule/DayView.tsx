"use client";
import Link from "next/link";
import type { ScheduleInstance } from "./types";
import { systemColor, statusColor } from "./types";

export function DayView({ instances, anchor }: { instances: ScheduleInstance[]; anchor: string }) {
  if (instances.length === 0) {
    return <EmptyState anchor={anchor} />;
  }
  const bySystem = groupBy(instances, (i) => i.system);
  const systems = Array.from(bySystem.keys()).sort();
  return (
    <div className="space-y-4">
      {systems.map((sys) => {
        const palette = systemColor(sys);
        const items = bySystem.get(sys)!;
        return (
          <div key={sys} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <div className={`inline-flex items-center gap-2 rounded-md px-2 py-0.5 ${palette.bg}`}>
                <span className={`text-sm font-semibold ${palette.text}`}>{sys}</span>
              </div>
              <div className="text-xs text-slate-500">{items.length} task{items.length === 1 ? "" : "s"}</div>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/admin/tasks/${i.template_id ?? ""}` as any}
                    className="flex items-center gap-3 py-2.5 hover:bg-slate-50"
                  >
                    <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium ${statusColor(i.status)}`}>
                      {i.status}
                    </span>
                    <span className="flex-1 truncate text-sm text-ehrc-navy">{i.task_name}</span>
                    {i.location_or_asset && (
                      <span className="shrink-0 text-xs text-slate-500">{i.location_or_asset}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ anchor }: { anchor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
      <div className="text-base font-medium text-ehrc-navy">No tasks for this day</div>
      <div className="mt-1 text-sm text-slate-500">
        Either none scheduled for {anchor}, or the engine hasn&apos;t generated forward yet.
      </div>
    </div>
  );
}

function groupBy<T, K>(arr: T[], keyFn: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of arr) {
    const k = keyFn(item);
    const list = m.get(k) ?? [];
    list.push(item);
    m.set(k, list);
  }
  return m;
}
