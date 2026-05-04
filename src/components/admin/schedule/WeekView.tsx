"use client";
import Link from "next/link";
import type { ScheduleInstance } from "./types";
import { startOfWeek, addDays, ymd, parseYmd, statusColor } from "./types";

export function WeekView({ instances, anchor }: { instances: ScheduleInstance[]; anchor: string }) {
  const start = startOfWeek(parseYmd(anchor));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const byDate = new Map<string, ScheduleInstance[]>();
  for (const inst of instances) {
    const list = byDate.get(inst.due_date) ?? [];
    list.push(inst);
    byDate.set(inst.due_date, list);
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 divide-x divide-slate-200">
        {days.map((d) => {
          const key = ymd(d);
          const isToday = key === ymd(new Date());
          const items = byDate.get(key) ?? [];
          return (
            <div key={key} className={`min-h-[300px] p-2 ${isToday ? "bg-ehrc-blue/5" : ""}`}>
              <div className="mb-2 flex items-baseline justify-between">
                <Link
                  href={`/admin/tasks?date=${key}` as any}
                  className="text-xs font-semibold text-ehrc-navy hover:underline"
                >
                  {d.toLocaleDateString(undefined, { weekday: "short" })} {d.getDate()}
                </Link>
                <span className="text-[10px] text-slate-400">{items.length}</span>
              </div>
              <div className="space-y-1">
                {items.slice(0, 8).map((i) => (
                  <Link
                    key={i.id}
                    href={`/admin/tasks/${i.template_id ?? ""}` as any}
                    className={`block truncate rounded border px-1.5 py-0.5 text-[11px] ${statusColor(i.status)}`}
                    title={`${i.system} · ${i.task_name}`}
                  >
                    <span className="font-mono opacity-70">{i.system}</span>{" "}
                    {i.task_name}
                  </Link>
                ))}
                {items.length > 8 && (
                  <Link
                    href={`/admin/tasks?date=${key}` as any}
                    className="block text-[10px] text-slate-500 hover:text-ehrc-navy"
                  >
                    +{items.length - 8} more
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
