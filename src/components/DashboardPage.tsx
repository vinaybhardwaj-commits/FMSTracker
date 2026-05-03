/**
 * src/components/DashboardPage.tsx — S08.
 *
 * Read-only operational view. No PIN gate. V/Charan/anyone can hit it.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProgressRings, type RingsData } from "./ProgressRings";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { SystemBadge } from "./SystemBadge";
import { systemMeta } from "@/lib/system-colors";

interface DashPayload {
  today: string;
  kpis: {
    today_done: number;
    today_total: number;
    today_pct: number | null;
    overdue: number;
    statutory_red_critical: number;
  };
  systems: { system: string; total: number; done: number }[];
  statutory: {
    id: number;
    licence_id: string | null;
    item: string;
    current_expiry: string | null;
    tier: "critical" | "red" | "orange" | "yellow" | "silent";
    days: number | null;
  }[];
  trend: { day: string; total: number; done: number }[];
  activity: {
    id: number;
    task_name: string;
    system: string;
    completed_by_name: string | null;
    completed_at: string | null;
    selfie_url: string | null;
    photo_urls: string[] | null;
  }[];
}

const TIER_COLOR: Record<string, string> = {
  critical: "bg-red-700",
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  silent: "bg-slate-300",
};

export function DashboardPage() {
  const [data, setData] = useState<DashPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [galleryItem, setGalleryItem] = useState<DashPayload["activity"][number] | null>(null);
  const [rings, setRings] = useState<RingsData>({ today: null, week: null, month: null });

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((p: DashPayload) => {
        setData(p);
        setRings({
          today: p.kpis.today_pct,
          week: avgPct(p.trend.slice(-7)),
          month: avgPct(p.trend),
        });
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <Link href={"/" as any} className="text-sm text-slate-500">◀ Today</Link>
        <div className="flex-1 text-center text-base font-semibold text-ehrc-navy">Dashboard</div>
        <ProgressRings data={rings} size="md" />
      </header>

      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!data ? (
        <div className="mx-4 mt-4 space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <section className="mx-4 mt-4 grid grid-cols-3 gap-3">
            <Kpi
              label="Today"
              value={data.kpis.today_pct == null ? "—" : `${Math.round(data.kpis.today_pct * 100)}%`}
              hint={`${data.kpis.today_done} of ${data.kpis.today_total}`}
              tone="blue"
            />
            <Kpi
              label="Overdue"
              value={data.kpis.overdue.toString()}
              hint=""
              tone={data.kpis.overdue > 0 ? "orange" : "slate"}
            />
            <Kpi
              label="Statutory urgent"
              value={data.kpis.statutory_red_critical.toString()}
              hint="red + critical"
              tone={data.kpis.statutory_red_critical > 0 ? "red" : "slate"}
            />
          </section>

          {/* System health grid */}
          <section className="mx-4 mt-6">
            <h2 className="mb-2 text-[13px] font-medium text-slate-600">System health (7-day rolling)</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.systems.length === 0 ? (
                <div className="col-span-full rounded-xl bg-white p-4 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                  No instances in the last 7 days.
                </div>
              ) : (
                data.systems.map((s) => {
                  const pct = s.total > 0 ? s.done / s.total : 0;
                  const meta = systemMeta(s.system);
                  const cls = pct >= 0.9 ? "text-green-700" : pct >= 0.7 ? "text-amber-700" : "text-red-700";
                  return (
                    <div key={s.system} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: meta.hex }} />
                        <span className="text-[12px] font-medium text-ehrc-navy">{meta.short}</span>
                      </div>
                      <div className={`mt-1 text-xl font-bold ${cls}`}>{Math.round(pct * 100)}%</div>
                      <div className="text-[11px] text-slate-500">
                        {s.done} of {s.total}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Statutory dashboard */}
          <section className="mx-4 mt-6">
            <h2 className="mb-2 text-[13px] font-medium text-slate-600">Statutory licences</h2>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              {data.statutory.length === 0 ? (
                <div className="py-3 text-center text-sm text-slate-500">No statutory items.</div>
              ) : (
                <div className="space-y-2">
                  {data.statutory.map((s) => {
                    const widthPct =
                      s.days == null ? 0 : Math.max(0, Math.min(100, (s.days / 365) * 100));
                    const colorCls = TIER_COLOR[s.tier] || "bg-slate-300";
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-32 truncate text-[12px] text-ehrc-navy">{s.item}</div>
                        <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full ${colorCls}`} style={{ width: `${widthPct}%` }} />
                        </div>
                        <div className="w-20 text-right text-[11px] text-slate-600">
                          {s.current_expiry == null
                            ? "no expiry set"
                            : s.days == null
                            ? "—"
                            : s.days < 0
                            ? `${Math.abs(s.days)}d expired`
                            : `${s.days}d left`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 30-day trend */}
          <section className="mx-4 mt-6">
            <h2 className="mb-2 text-[13px] font-medium text-slate-600">30-day completion trend</h2>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <Sparkline data={data.trend} />
            </div>
          </section>

          {/* Activity feed */}
          <section className="mx-4 mt-6">
            <h2 className="mb-2 text-[13px] font-medium text-slate-600">Recent activity</h2>
            <div className="space-y-1.5">
              {data.activity.length === 0 ? (
                <div className="rounded-xl bg-white p-4 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                  No completions yet.
                </div>
              ) : (
                data.activity.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setGalleryItem(a)}
                    className="block w-full rounded-xl bg-white p-2 text-left ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <SystemBadge system={a.system} variant="short" />
                      <span className="line-clamp-1 flex-1 text-[13px] text-ehrc-navy">{a.task_name}</span>
                      <span className="text-[11px] text-slate-500">
                        {a.completed_at ? new Date(a.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{a.completed_by_name ?? "—"}</div>
                  </button>
                ))
              )}
            </div>
          </section>
        </>
      )}

      <PhotoGalleryModal
        open={galleryItem !== null}
        title={galleryItem?.task_name ?? ""}
        subtitle={galleryItem ? `${galleryItem.completed_by_name ?? ""} · ${galleryItem.completed_at ? new Date(galleryItem.completed_at).toLocaleString() : ""}` : ""}
        items={
          galleryItem
            ? [
                ...(galleryItem.selfie_url ? [{ url: galleryItem.selfie_url, isSelfie: true }] : []),
                ...(galleryItem.photo_urls ?? []).map((u) => ({ url: u })),
              ]
            : []
        }
        reading={null}
        vendorDue={null}
        onClose={() => setGalleryItem(null)}
      />
    </main>
  );
}

function avgPct(rows: { total: number; done: number }[]): number | null {
  let total = 0;
  let done = 0;
  for (const r of rows) {
    total += r.total;
    done += r.done;
  }
  return total > 0 ? done / total : null;
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "blue" | "orange" | "red" | "slate" }) {
  const cls =
    tone === "blue"
      ? "text-ehrc-blue"
      : tone === "orange"
      ? "text-orange-700"
      : tone === "red"
      ? "text-red-700"
      : "text-slate-600";
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${cls}`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function Sparkline({ data }: { data: { day: string; total: number; done: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="py-2 text-center text-[12px] text-slate-500">No data yet.</div>;
  }
  const W = 320;
  const H = 60;
  const maxX = Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const pct = d.total > 0 ? d.done / d.total : 0;
    const x = (i / maxX) * W;
    const y = H - pct * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(" L ")}`;
  const lastPct = (() => {
    const last = data[data.length - 1];
    return last.total > 0 ? Math.round((last.done / last.total) * 100) : 0;
  })();
  return (
    <div className="flex items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="flex-1">
        <path d={path} fill="none" stroke="#0055FF" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="text-right">
        <div className="text-lg font-bold text-ehrc-blue">{lastPct}%</div>
        <div className="text-[10px] text-slate-500">today</div>
      </div>
    </div>
  );
}
