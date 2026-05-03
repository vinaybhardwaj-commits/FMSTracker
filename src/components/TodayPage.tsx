/**
 * src/components/TodayPage.tsx — S02 client component.
 *
 * Fetches /api/today, renders sections (Overdue / Today / Done today accordion).
 * Includes pull-to-refresh, loading, empty, error states.
 */

"use client";

import { useEffect, useState } from "react";
import { WorkerShell } from "./WorkerShell";
import { StatutoryBanner, type StatutoryUrgent } from "./StatutoryBanner";
import { TaskCard, type TaskCardData } from "./TaskCard";
import type { LocalDevice } from "@/lib/device";
import type { RingsData } from "./ProgressRings";

interface TodayPayload {
  today: string;
  instances: TaskCardData[];
  urgent_statutory: StatutoryUrgent[];
  upcoming_statutory?: Array<{ id: number; item: string; tier: "yellow" | "orange"; days: number | null }>;
  rings?: RingsData;
}

export function TodayPage({ device }: { device: LocalDevice }) {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/today", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as TodayPayload;
      setData(payload);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // soft auto-refresh every 60s
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rings: RingsData = data?.rings ?? { today: null, week: null, month: null };

  const instances = data?.instances ?? [];
  const overdue = instances.filter((i) => i.status === "overdue");
  const todayDue = instances.filter((i) => i.status !== "overdue" && i.status !== "done" && i.status !== "skipped");
  const doneToday = instances.filter((i) => i.status === "done");
  const totalTodayActive = todayDue.length;

  return (
    <main className="min-h-screen bg-slate-50">
      <WorkerShell
        name={device.name}
        avatarUrl={device.baseline_selfie_url}
        rings={rings}
      />
      <StatutoryBanner items={data?.urgent_statutory ?? []} />

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Couldn't load today: {error}.{" "}
          <button onClick={load} className="underline">
            Try again
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="mx-4 mt-3 space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[140px] animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      )}

      {data && instances.length === 0 && (
        <div className="mx-4 mt-12 rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-base font-semibold text-ehrc-navy">No tasks scheduled for today.</div>
          <div className="mt-2 text-sm text-slate-500">
            The next scheduled tasks will appear after the engine runs at 04:00 IST.
          </div>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <section className="mt-3">
          <SectionHeader label="Overdue" count={overdue.length} tint="orange" />
          <div className="mx-4 space-y-2">
            {overdue.map((t) => (
              <TaskCard key={t.id} task={t} myDeviceUuid={device.device_uuid} />
            ))}
          </div>
        </section>
      )}

      {/* Today */}
      {todayDue.length > 0 && (
        <section className="mt-3">
          <SectionHeader
            label="Today"
            count={totalTodayActive}
            tint="default"
            extra={`${todayDue.length} left of ${todayDue.length + doneToday.length}`}
          />
          <div className="mx-4 space-y-2 pb-6">
            {todayDue.map((t) => (
              <TaskCard key={t.id} task={t} myDeviceUuid={device.device_uuid} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming statutory (yellow + orange tier — surfaced per PRD §3.3) */}
      {data && (data.upcoming_statutory ?? []).length > 0 && (
        <section className="mt-3">
          <SectionHeader label="Upcoming statutory" count={(data.upcoming_statutory ?? []).length} tint="default" />
          <div className="mx-4 space-y-2 pb-2">
            {(data.upcoming_statutory ?? []).map((s) => {
              const tone = s.tier === "orange" ? "border-orange-300 bg-orange-50" : "border-yellow-300 bg-yellow-50";
              const verb = s.tier === "orange" ? "Start renewal" : "Plan vendor coordination";
              return (
                <a
                  key={s.id}
                  href={`/admin/statutory/${s.id}`}
                  className={`block rounded-2xl border bg-white p-3 ${tone}`}
                >
                  <div className="text-[15px] font-semibold text-ehrc-navy">📜 {s.item}</div>
                  <div className="mt-0.5 text-[12px] text-slate-600">
                    {s.days} days to expiry · {verb}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Done today (collapsed accordion) */}
      {doneToday.length > 0 && (
        <section className="mt-1 pb-12">
          <button
            onClick={() => setDoneOpen((o) => !o)}
            className="flex w-full items-center justify-between bg-slate-50 px-4 py-2 text-left text-[13px] text-slate-600"
          >
            <span>Done today · {doneToday.length}</span>
            <span aria-hidden>{doneOpen ? "▾" : "▸"}</span>
          </button>
          {doneOpen && (
            <div className="mx-4 mt-2 space-y-2">
              {doneToday.map((t) => (
                <TaskCard key={t.id} task={t} myDeviceUuid={device.device_uuid} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function SectionHeader({
  label,
  count,
  tint,
  extra,
}: {
  label: string;
  count: number;
  tint: "default" | "orange";
  extra?: string;
}) {
  const cls =
    tint === "orange"
      ? "bg-orange-50 text-orange-800"
      : "bg-slate-50 text-slate-600";
  return (
    <div
      className={`sticky top-14 z-30 flex items-baseline justify-between border-y border-slate-200 px-4 py-2 text-[13px] font-medium ${cls}`}
    >
      <span>
        {label} · {count}
      </span>
      {extra && <span className="text-[11px] text-slate-500">{extra}</span>}
    </div>
  );
}
