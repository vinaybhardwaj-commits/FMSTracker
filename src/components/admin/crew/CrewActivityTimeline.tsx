"use client";
import { useAdminPoll } from "@/lib/use-admin-poll";

interface ActivityRow {
  id: number;
  task_name: string;
  system: string;
  due_date: string;
  status: string;
  claimed_at: string | null;
  completed_at: string | null;
  selfie_url: string | null;
  photo_urls: string[] | null;
  skip_reason: string | null;
}

interface BySystem { system: string; count: number; }

interface Resp {
  ok: boolean;
  device: { id: string; name: string; baseline_selfie_url: string | null; created_at: string; last_seen_at: string };
  activity: ActivityRow[];
  by_system: BySystem[];
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function CrewActivityTimeline({ deviceId }: { deviceId: string }) {
  const poll = useAdminPoll<Resp>(
    () => fetch(`/api/admin/crew/${deviceId}/activity`).then((r) => r.json()),
    5 * 60 * 1000
  );

  if (!poll.data && !poll.error) {
    return <div className="space-y-2"><div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" /></div>;
  }
  if (poll.error) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">Couldn&apos;t load: {poll.error}</div>;
  }
  const data = poll.data!;

  return (
    <div className="space-y-6">
      {/* Per-system 30-day breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="text-sm font-semibold text-ehrc-navy">Completion by system · last 30 days</div>
            <div className="text-xs text-slate-500">{data.by_system.reduce((sum, s) => sum + s.count, 0)} total completed</div>
          </div>
        </div>
        {data.by_system.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">No completions in the last 30 days.</div>
        ) : (
          <ul className="space-y-1.5">
            {data.by_system.map((s) => {
              const max = Math.max(1, ...data.by_system.map((x) => x.count));
              const pct = (s.count / max) * 100;
              return (
                <li key={s.system}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-mono text-xs text-slate-700">{s.system}</span>
                    <span className="font-medium text-ehrc-navy">{s.count}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-ehrc-blue" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Activity feed */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="text-sm font-semibold text-ehrc-navy">Activity · last 30 days</div>
            <div className="text-xs text-slate-500">{data.activity.length} task{data.activity.length === 1 ? "" : "s"} touched</div>
          </div>
        </div>
        {data.activity.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">No activity in the last 30 days.</div>
        ) : (
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {data.activity.map((a) => (
              <li key={a.id} className="relative">
                <span className={`absolute -left-[19px] top-1.5 h-2 w-2 rounded-full ${
                  a.status === "done" ? "bg-emerald-500" :
                  a.status === "claimed" ? "bg-ehrc-blue" :
                  a.status === "skipped" ? "bg-amber-500" : "bg-slate-400"
                }`} />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-ehrc-navy">{a.task_name}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    a.status === "done" ? "bg-emerald-100 text-emerald-800" :
                    a.status === "claimed" ? "bg-ehrc-blue/10 text-ehrc-blue" :
                    a.status === "skipped" ? "bg-amber-100 text-amber-800" :
                    "bg-slate-100 text-slate-700"
                  }`}>{a.status}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-mono">{a.system}</span>
                  <span>· due {a.due_date}</span>
                  {a.completed_at && <span>· completed {fmtDateTime(a.completed_at)}</span>}
                  {!a.completed_at && a.claimed_at && <span>· claimed {fmtDateTime(a.claimed_at)}</span>}
                  {a.skip_reason && <span className="italic">· skipped: {a.skip_reason}</span>}
                  {a.status === "done" && (!a.selfie_url || (Array.isArray(a.photo_urls) && a.photo_urls.length === 0)) && (
                    <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800" title={
                      !a.selfie_url ? "No selfie" : "No photos"
                    }>
                      ⚠ {!a.selfie_url ? "no selfie" : "no photos"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
