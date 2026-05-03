/**
 * src/components/YesterdayPage.tsx — S07.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkerShell } from "./WorkerShell";
import { SystemBadge } from "./SystemBadge";
import { systemMeta } from "@/lib/system-colors";
import type { LocalDevice } from "@/lib/device";
import type { RingsData } from "./ProgressRings";

interface RecapItem {
  id: number;
  task_name: string;
  system: string;
  location_or_asset: string | null;
  status: string;
  completed_by_name: string | null;
  completed_at: string | null;
  selfie_url: string | null;
  photo_urls: string[] | null;
  reading_value: string | null;
  skip_reason: string | null;
  priority_weight: number;
}

interface RecapPayload {
  date: string;
  metrics: { done: number; skipped: number; missed: number; total: number };
  done: RecapItem[];
  skipped: RecapItem[];
  missed: RecapItem[];
}

const TODAY_ISO_OFFSET = (() => {
  // Compute 'today' in IST as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
})();

function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function humanDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const SKIP_LABELS: Record<string, string> = {
  not_enough_staff: "Not enough staff",
  area_in_use: "Area in use",
  supplies_unavailable: "Supplies unavailable",
  other: "Other",
};

export function YesterdayPage({ device, rings }: { device: LocalDevice; rings: RingsData }) {
  const router = useRouter();
  const [date, setDate] = useState(() => shiftIso(TODAY_ISO_OFFSET, -1));
  const [data, setData] = useState<RecapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/recap/yesterday?date=${date}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const p = (await r.json()) as RecapPayload;
      setData(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const isToday = date >= TODAY_ISO_OFFSET;

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <WorkerShell name={device.name} avatarUrl={device.baseline_selfie_url} rings={rings} />

      {/* Date selector */}
      <div className="sticky top-14 z-30 flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
        <button
          onClick={() => setDate(shiftIso(date, -1))}
          aria-label="Previous day"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
        >
          ◀
        </button>
        <div className="text-[15px] font-medium text-ehrc-navy">{humanDate(date)}</div>
        <button
          onClick={() => setDate(shiftIso(date, 1))}
          disabled={isToday}
          aria-label="Next day"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          ▶
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}{" "}
          <button onClick={load} className="underline">
            Try again
          </button>
        </div>
      )}

      {/* Metric tiles */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <MetricTile label="Done" count={data?.metrics.done} tint="green" target="done" />
        <MetricTile label="Skipped" count={data?.metrics.skipped} tint="slate" target="skipped" />
        <MetricTile label="Missed" count={data?.metrics.missed} tint="orange" target="missed" />
      </div>

      {loading && !data && (
        <div className="mx-4 mt-4 space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      )}

      {data && data.metrics.total === 0 && !loading && (
        <div className="mx-4 mt-12 rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-base font-semibold text-ehrc-navy">No tasks scheduled for {humanDate(date)}.</div>
        </div>
      )}

      {data && data.done.length > 0 && (
        <Section id="done" label="Done" count={data.done.length}>
          {data.done.map((it, i) => (
            <DoneRow key={it.id} item={it} alt={i % 2 === 1} />
          ))}
        </Section>
      )}

      {data && data.skipped.length > 0 && (
        <Section id="skipped" label="Skipped" count={data.skipped.length}>
          {data.skipped.map((it, i) => (
            <SkippedRow
              key={it.id}
              item={it}
              alt={i % 2 === 1}
              onTap={() => router.push((`/instance/${it.id}` as unknown) as never)}
            />
          ))}
        </Section>
      )}

      {data && data.missed.length > 0 && (
        <Section id="missed" label="Missed" count={data.missed.length}>
          {data.missed.map((it, i) => (
            <MissedRow
              key={it.id}
              item={it}
              alt={i % 2 === 1}
              onTap={() => router.push("/" as never)}
            />
          ))}
        </Section>
      )}
    </main>
  );
}

function MetricTile({ label, count, tint, target }: { label: string; count?: number; tint: "green" | "slate" | "orange"; target: string }) {
  const cls =
    tint === "green"
      ? "bg-green-50"
      : tint === "orange"
      ? "bg-orange-50"
      : "bg-slate-100";
  return (
    <a
      href={`#${target}`}
      className={`flex h-16 flex-col items-center justify-center rounded-xl ${cls} text-ehrc-navy`}
    >
      <div className="text-2xl font-bold leading-none">
        {count == null ? "–" : count === 0 ? "—" : count}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </a>
  );
}

function Section({ id, label, count, children }: { id: string; label: string; count: number; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-4">
      <div className="sticky top-[calc(56px+44px)] z-20 border-y border-slate-200 bg-slate-50 px-4 py-1.5 text-[13px] font-medium text-slate-600">
        {label} · {count}
      </div>
      <div className="mt-2 space-y-1.5 px-4">{children}</div>
    </section>
  );
}

function DoneRow({ item, alt }: { item: RecapItem; alt: boolean }) {
  const meta = systemMeta(item.system);
  const photos = item.photo_urls ?? [];
  const visible = photos.slice(0, 3);
  const moreCount = Math.max(0, photos.length - visible.length);
  return (
    <div className={`flex gap-2 rounded-xl p-2 ring-1 ring-slate-200 ${alt ? "bg-slate-50" : "bg-white"}`}>
      <div className="w-1 shrink-0 rounded-full" style={{ background: meta.hex }} />
      <div className="flex-1 min-w-0">
        <div className="line-clamp-1 text-[14px] text-ehrc-navy">{item.task_name}</div>
        <div className="mt-1 flex items-center gap-1">
          {item.selfie_url && (
            <img src={item.selfie_url} alt="" className="h-9 w-9 rounded-md object-cover ring-1 ring-slate-300" />
          )}
          {visible.map((url, i) => (
            <img key={i} src={url} alt="" className="h-9 w-9 rounded-md object-cover ring-1 ring-slate-200" />
          ))}
          {moreCount > 0 && (
            <span className="ml-1 rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700">+{moreCount}</span>
          )}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          {item.completed_by_name || "—"} · {formatTime(item.completed_at)}
        </div>
      </div>
    </div>
  );
}

function SkippedRow({ item, alt, onTap }: { item: RecapItem; alt: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className={`block w-full rounded-xl p-3 text-left ring-1 ring-slate-200 ${alt ? "bg-slate-50" : "bg-white"}`}
    >
      <div className="line-clamp-1 text-[14px] text-ehrc-navy">⊘ {item.task_name}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px]">
        {item.skip_reason && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
            {SKIP_LABELS[item.skip_reason] ?? item.skip_reason}
          </span>
        )}
        <span className="text-slate-500">
          {item.completed_by_name || "—"} · {formatTime(item.completed_at)}
        </span>
      </div>
    </button>
  );
}

function MissedRow({ item, alt, onTap }: { item: RecapItem; alt: boolean; onTap: () => void }) {
  return (
    <div className={`flex gap-2 rounded-xl p-3 ring-1 ring-orange-200 ${alt ? "bg-orange-50/40" : "bg-white"}`}>
      <div className="w-1 shrink-0 rounded-full bg-orange-500" />
      <div className="flex-1 min-w-0">
        <div className="line-clamp-1 text-[14px] text-ehrc-navy">⚠ {item.task_name}</div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Carried over to today</span>
          <button onClick={onTap} className="font-medium text-orange-700 hover:underline">
            View →
          </button>
        </div>
      </div>
    </div>
  );
}
