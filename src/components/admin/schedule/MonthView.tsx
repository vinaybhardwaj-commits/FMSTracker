"use client";
import Link from "next/link";
import type { ScheduleInstance } from "./types";
import { startOfMonth, addDays, ymd, parseYmd } from "./types";

export function MonthView({ instances, anchor }: { instances: ScheduleInstance[]; anchor: string }) {
  const monthStart = startOfMonth(parseYmd(anchor));
  const dow = monthStart.getDay();
  const gridStart = addDays(monthStart, -dow);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const byDate = new Map<string, ScheduleInstance[]>();
  for (const inst of instances) {
    const list = byDate.get(inst.due_date) ?? [];
    list.push(inst);
    byDate.set(inst.due_date, list);
  }
  // Heat scale by count
  const counts = cells.map((c) => byDate.get(ymd(c))?.length ?? 0);
  const max = Math.max(1, ...counts);
  const heat = (n: number) => {
    if (n === 0) return "bg-white";
    const ratio = n / max;
    if (ratio < 0.25) return "bg-ehrc-blue/5";
    if (ratio < 0.5) return "bg-ehrc-blue/10";
    if (ratio < 0.75) return "bg-ehrc-blue/20";
    return "bg-ehrc-blue/30";
  };
  const todayKey = ymd(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="px-2 py-1.5 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-slate-100">
        {cells.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === monthStart.getMonth();
          const items = byDate.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <Link
              key={key}
              href={`/admin/tasks?date=${key}` as any}
              className={`relative min-h-[88px] border-b border-slate-100 p-1.5 transition hover:ring-1 hover:ring-ehrc-blue/40 ${heat(items.length)} ${
                inMonth ? "" : "opacity-40"
              } ${isToday ? "ring-1 ring-ehrc-blue" : ""}`}
            >
              <div className="flex items-baseline justify-between">
                <span className={`text-xs font-semibold ${inMonth ? "text-ehrc-navy" : "text-slate-400"}`}>
                  {d.getDate()}
                </span>
                {items.length > 0 && (
                  <span className="text-[10px] font-bold text-ehrc-blue">{items.length}</span>
                )}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {items.slice(0, 3).map((i) => (
                  <div key={i.id} className="truncate text-[10px] text-slate-700" title={i.task_name}>
                    {i.task_name}
                  </div>
                ))}
                {items.length > 3 && <div className="text-[10px] text-slate-500">+{items.length - 3}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
