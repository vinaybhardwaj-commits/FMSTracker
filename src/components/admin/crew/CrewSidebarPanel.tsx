"use client";
import { useAdminPoll } from "@/lib/use-admin-poll";

interface Resp {
  ok: boolean;
  device: { id: string; name: string; baseline_selfie_url: string | null; created_at: string; last_seen_at: string };
}

export function CrewSidebarPanel({ deviceId }: { deviceId: string }) {
  const poll = useAdminPoll<Resp>(
    () => fetch(`/api/admin/crew/${deviceId}/activity`).then((r) => r.json()),
    5 * 60 * 1000
  );
  const d = poll.data?.device;
  return (
    <aside className="sticky top-20 self-start space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Baseline selfie</div>
        {d?.baseline_selfie_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.baseline_selfie_url} alt={d.name} className="mx-auto mt-3 h-32 w-32 rounded-full object-cover ring-2 ring-slate-100" />
        ) : (
          <div className="mx-auto mt-3 flex h-32 w-32 items-center justify-center rounded-full bg-slate-100 text-3xl font-bold text-slate-400">
            {d?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        )}
        <div className="mt-3 text-base font-semibold text-ehrc-navy">{d?.name ?? "—"}</div>
        <div className="mt-1 text-xs text-slate-500">
          {d?.created_at && <>Onboarded {new Date(d.created_at).toLocaleDateString()}</>}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {d?.last_seen_at && <>Last seen {new Date(d.last_seen_at).toLocaleDateString()}</>}
        </div>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <span className="font-medium text-ehrc-navy">Force re-onboarding</span> + bulk-deactivate flows ship in v1.x. Currently devices stay listed indefinitely.
      </div>
    </aside>
  );
}
