"use client";
import Link from "next/link";
import type { ScheduleInstance } from "./types";
import { startOfQuarter, parseYmd, ymd } from "./types";

export function QuarterView({ instances, anchor }: { instances: ScheduleInstance[]; anchor: string }) {
  const qStart = startOfQuarter(parseYmd(anchor));
  const months = [0, 1, 2].map((i) => new Date(qStart.getFullYear(), qStart.getMonth() + i, 1));
  // Group by month, then by system
  const byMonthSys = new Map<string, Map<string, number>>();
  for (const inst of instances) {
    const d = parseYmd(inst.due_date);
    const monthKey = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
    if (!byMonthSys.has(monthKey)) byMonthSys.set(monthKey, new Map());
    const sysMap = byMonthSys.get(monthKey)!;
    sysMap.set(inst.system, (sysMap.get(inst.system) ?? 0) + 1);
  }
  const allSystems = new Set<string>();
  byMonthSys.forEach((sm) => sm.forEach((_, s) => allSystems.add(s)));
  const sortedSystems = Array.from(allSystems).sort();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-3 divide-x divide-slate-200">
        {months.map((m) => {
          const mKey = ymd(m);
          const sysMap = byMonthSys.get(mKey) ?? new Map();
          const total = Array.from(sysMap.values()).reduce((a, b) => a + b, 0);
          return (
            <div key={mKey} className="p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <Link
                  href={`/admin/schedule?view=month&anchor=${mKey}` as any}
                  className="text-base font-semibold text-ehrc-navy hover:underline"
                >
                  {m.toLocaleDateString(undefined, { month: "long" })}
                </Link>
                <span className="text-xs text-slate-500">{total} task{total === 1 ? "" : "s"}</span>
              </div>
              {sortedSystems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No data</div>
              ) : (
                <ul className="space-y-1.5">
                  {sortedSystems.map((sys) => {
                    const count = sysMap.get(sys) ?? 0;
                    if (count === 0) return null;
                    return (
                      <li key={sys} className="flex items-baseline justify-between text-sm">
                        <span className="font-mono text-xs text-slate-700">{sys}</span>
                        <span className="font-medium text-ehrc-navy">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
