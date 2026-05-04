/**
 * src/components/admin/schedule/ScheduleControls.tsx — AD1.3
 *
 * Top control bar: view toggle, date navigation (prev/today/next), filter chips.
 * State is held in URL search params (view, anchor, systems, cadence).
 */

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { VIEWS, type ViewMode, ymd, addDays, startOfWeek, startOfMonth, startOfQuarter, startOfYear, parseYmd } from "./types";
import { useMemo } from "react";

interface Props {
  view: ViewMode;
  anchor: string; // YYYY-MM-DD
  systems: string[];
  cadences: string[];
  availableSystems: string[];
}

const CADENCES = ["daily", "weekly", "monthly", "quarterly", "semi_annual", "annual", "statutory_renewal"];

export function ScheduleControls({ view, anchor, systems, cadences, availableSystems }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") sp.delete(key);
    else sp.set(key, value);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  function nav(direction: "prev" | "today" | "next") {
    if (direction === "today") {
      setParam("anchor", ymd(new Date()));
      return;
    }
    const d = parseYmd(anchor);
    const sign = direction === "prev" ? -1 : 1;
    let next: Date;
    switch (view) {
      case "day": next = addDays(d, sign); break;
      case "week": next = addDays(d, sign * 7); break;
      case "month": next = new Date(d.getFullYear(), d.getMonth() + sign, 1); break;
      case "quarter": next = new Date(d.getFullYear(), d.getMonth() + sign * 3, 1); break;
      case "year": next = new Date(d.getFullYear() + sign, 0, 1); break;
    }
    setParam("anchor", ymd(next));
  }

  const periodLabel = useMemo(() => {
    const d = parseYmd(anchor);
    switch (view) {
      case "day":
        return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      case "week": {
        const s = startOfWeek(d);
        const e = addDays(s, 6);
        return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
      }
      case "month":
        return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      case "quarter": {
        const s = startOfQuarter(d);
        return `Q${Math.floor(s.getMonth() / 3) + 1} ${s.getFullYear()}`;
      }
      case "year":
        return String(d.getFullYear());
    }
  }, [anchor, view]);

  function toggleSystem(s: string) {
    const next = systems.includes(s) ? systems.filter((x) => x !== s) : [...systems, s];
    setParam("systems", next.join(","));
  }
  function toggleCadence(c: string) {
    const next = cadences.includes(c) ? cadences.filter((x) => x !== c) : [...cadences, c];
    setParam("cadence", next.join(","));
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setParam("view", v.key)}
            className={`rounded-md px-2.5 py-1 text-sm font-medium ${
              view === v.key ? "bg-ehrc-navy text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => nav("prev")} className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50" aria-label="Previous">‹</button>
        <button type="button" onClick={() => nav("today")} className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50">Today</button>
        <button type="button" onClick={() => nav("next")} className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50" aria-label="Next">›</button>
      </div>

      <div className="text-base font-semibold text-ehrc-navy">{periodLabel}</div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-slate-400">System</span>
        {availableSystems.slice(0, 12).map((s) => {
          const active = systems.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleSystem(s)}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                active ? "bg-ehrc-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 basis-full">
        <span className="text-[11px] uppercase tracking-wider text-slate-400">Cadence</span>
        {CADENCES.map((c) => {
          const active = cadences.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCadence(c)}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                active ? "bg-ehrc-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
