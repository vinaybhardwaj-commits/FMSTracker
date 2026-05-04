"use client";
import Link from "next/link";
import type { ScheduleInstance, StatutoryMarker } from "./types";
import { parseYmd, startOfYear } from "./types";

interface Props {
  instances: ScheduleInstance[];
  statutoryMarkers: StatutoryMarker[];
  anchor: string;
}

export function YearView({ instances, statutoryMarkers, anchor }: Props) {
  const year = parseYmd(anchor).getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);

  // Compute per-system per-month task counts (from instances)
  const sysMonths = new Map<string, number[]>();
  for (const inst of instances) {
    const d = parseYmd(inst.due_date);
    if (d.getFullYear() !== year) continue;
    const list = sysMonths.get(inst.system) ?? Array(12).fill(0);
    list[d.getMonth()] += 1;
    sysMonths.set(inst.system, list);
  }
  const systems = Array.from(sysMonths.keys()).sort();

  // Statutory markers grouped by month
  const statByMonth: Map<number, StatutoryMarker[]> = new Map();
  for (const m of statutoryMarkers) {
    const d = parseYmd(m.current_expiry);
    if (d.getFullYear() !== year) continue;
    const list = statByMonth.get(d.getMonth()) ?? [];
    list.push(m);
    statByMonth.set(d.getMonth(), list);
  }

  return (
    <div className="space-y-6">
      {/* Statutory markers strip */}
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-2 text-sm font-semibold text-amber-900">Statutory renewals · {year}</div>
        {statutoryMarkers.length === 0 ? (
          <div className="text-xs text-amber-800">No statutory renewals due in {year}.</div>
        ) : (
          <div className="grid grid-cols-12 gap-1">
            {months.map((m) => {
              const items = statByMonth.get(m) ?? [];
              return (
                <div key={m} className="rounded-md bg-white/60 p-1.5">
                  <div className="text-[10px] font-semibold uppercase text-amber-700">
                    {new Date(year, m, 1).toLocaleDateString(undefined, { month: "short" })}
                  </div>
                  {items.length === 0 ? (
                    <div className="mt-1 h-1 w-full" />
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {items.map((it) => (
                        <li key={it.id}>
                          <Link
                            href={"/admin/statutory" as any}
                            className="block truncate text-[10px] font-medium text-amber-900 hover:underline"
                            title={`${it.item} (${it.licence_id ?? "—"})`}
                          >
                            ▌ {it.licence_id ?? it.item.slice(0, 12)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-system × month grid (instances generated to date) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-ehrc-navy">
          Generated tasks · {year}
          <span className="ml-2 text-xs font-normal text-slate-500">
            Reflects engine-generated rows only — projection deferred to v1.x
          </span>
        </div>
        {systems.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No tasks generated for {year} yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2 text-left font-normal">System</th>
                {months.map((m) => (
                  <th key={m} className="px-2 py-2 text-center font-normal">
                    {new Date(year, m, 1).toLocaleDateString(undefined, { month: "short" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {systems.map((sys) => {
                const counts = sysMonths.get(sys) ?? [];
                const maxC = Math.max(1, ...counts);
                return (
                  <tr key={sys}>
                    <td className="px-3 py-1.5 font-mono text-xs text-slate-700">{sys}</td>
                    {months.map((m) => {
                      const c = counts[m] ?? 0;
                      const heat =
                        c === 0
                          ? "bg-white"
                          : c / maxC < 0.33
                          ? "bg-ehrc-blue/10"
                          : c / maxC < 0.66
                          ? "bg-ehrc-blue/25"
                          : "bg-ehrc-blue/40";
                      return (
                        <td key={m} className={`px-2 py-1.5 text-center text-xs ${heat}`}>
                          {c > 0 ? <Link href={`/admin/schedule?view=month&anchor=${year}-${String(m + 1).padStart(2, "0")}-01` as any} className="font-medium text-ehrc-navy hover:underline">{c}</Link> : <span className="text-slate-300">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
