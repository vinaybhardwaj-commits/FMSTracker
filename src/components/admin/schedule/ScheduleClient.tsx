/**
 * src/components/admin/schedule/ScheduleClient.tsx — AD1.3
 *
 * Client wrapper that reads view + anchor from URL, computes the date range,
 * fetches instances + statutory markers, and dispatches to the right view.
 */

"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminPoll } from "@/lib/use-admin-poll";
import {
  type ViewMode,
  type ScheduleInstance,
  type StatutoryMarker,
  ymd,
  parseYmd,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  addDays,
} from "./types";
import { ScheduleControls } from "./ScheduleControls";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { QuarterView } from "./QuarterView";
import { YearView } from "./YearView";

interface Props {
  availableSystems: string[];
}

function computeRange(view: ViewMode, anchorYmd: string): { from: string; to: string } {
  const d = parseYmd(anchorYmd);
  switch (view) {
    case "day":
      return { from: anchorYmd, to: anchorYmd };
    case "week": {
      const s = startOfWeek(d);
      return { from: ymd(s), to: ymd(addDays(s, 6)) };
    }
    case "month": {
      const s = startOfMonth(d);
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      return { from: ymd(s), to: ymd(e) };
    }
    case "quarter": {
      const s = startOfQuarter(d);
      const e = new Date(s.getFullYear(), s.getMonth() + 3, 0);
      return { from: ymd(s), to: ymd(e) };
    }
    case "year": {
      const s = startOfYear(d);
      const e = new Date(s.getFullYear(), 11, 31);
      return { from: ymd(s), to: ymd(e) };
    }
  }
}

export function ScheduleClient({ availableSystems }: Props) {
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as ViewMode | null) ?? "week";
  const anchor = searchParams.get("anchor") ?? ymd(new Date());
  const systemsRaw = searchParams.get("systems") ?? "";
  const cadenceRaw = searchParams.get("cadence") ?? "";
  const systems = systemsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const cadences = cadenceRaw.split(",").map((s) => s.trim()).filter(Boolean);

  const range = useMemo(() => computeRange(view, anchor), [view, anchor]);

  const queryStr = useMemo(() => {
    const sp = new URLSearchParams({ from: range.from, to: range.to });
    if (systems.length) sp.set("systems", systems.join(","));
    if (cadences.length) sp.set("cadence", cadences.join(","));
    return sp.toString();
  }, [range, systems, cadences]);

  const instances = useAdminPoll<{ ok: boolean; instances: ScheduleInstance[] }>(
    () => fetch(`/api/admin/schedule/instances?${queryStr}`).then((r) => r.json()),
    5 * 60 * 1000 // 5 min — schedule data doesn't change as fast as the dashboard
  );

  const statutory = useAdminPoll<{ ok: boolean; markers: StatutoryMarker[] }>(
    () =>
      fetch(
        `/api/admin/schedule/statutory-markers?from=${range.from}&to=${range.to}`
      ).then((r) => r.json()),
    60 * 60 * 1000, // hourly
  );

  const instArr: ScheduleInstance[] = instances.data?.instances ?? [];
  const statArr: StatutoryMarker[] = statutory.data?.markers ?? [];

  const loading = !instances.data && !instances.error;

  return (
    <div>
      <ScheduleControls
        view={view}
        anchor={anchor}
        systems={systems}
        cadences={cadences}
        availableSystems={availableSystems}
      />

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Loading…
        </div>
      )}

      {instances.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Couldn&apos;t load: {instances.error}
          <button
            type="button"
            onClick={instances.refetch}
            className="ml-3 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !instances.error && (
        <>
          {view === "day" && <DayView instances={instArr} anchor={anchor} />}
          {view === "week" && <WeekView instances={instArr} anchor={anchor} />}
          {view === "month" && <MonthView instances={instArr} anchor={anchor} />}
          {view === "quarter" && <QuarterView instances={instArr} anchor={anchor} />}
          {view === "year" && (
            <YearView instances={instArr} statutoryMarkers={statArr} anchor={anchor} />
          )}
        </>
      )}
    </div>
  );
}
