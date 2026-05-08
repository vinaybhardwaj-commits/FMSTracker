/**
 * src/components/admin/tasks/InFlightImpactPanel.tsx — AD1.2
 *
 * Side panel on the edit page. Polls /in-flight every 30s. Surfaces:
 *  - counts by status
 *  - 5 most-recent in-flight task_instances with status + due_date
 *  - "Force propagate edits…" button that opens ForcePropagateModal
 */

"use client";

import { useEffect, useState } from "react";
import { useAdminPoll } from "@/lib/use-admin-poll";
import { ForcePropagateModal } from "./ForcePropagateModal";

interface InFlightResp {
  ok: boolean;
  template_id: number;
  counts: {
    pending?: number;
    claimed?: number;
    done?: number;
    overdue?: number;
    skipped?: number;
    auto_skipped?: number;
    propagatable?: number;
    total?: number;
  };
  recent: {
    id: number;
    task_name: string;
    system: string;
    due_date: string;
    status: string;
  }[];
}

interface Props {
  templateId: number;
  /** Snapshot of template values, used to compute changed fields for propagate modal. */
  templateSnapshot: Record<string, unknown>;
}

export function InFlightImpactPanel({ templateId, templateSnapshot }: Props) {
  const [showModal, setShowModal] = useState(false);
  const poll = useAdminPoll<InFlightResp>(
    () => fetch(`/api/admin/templates/${templateId}/in-flight`).then((r) => r.json()),
    30000
  );

  const counts = poll.data?.counts ?? {};
  const propagatable = counts.propagatable ?? 0;

  return (
    <aside className="sticky top-20 self-start">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-ehrc-navy">In-flight impact</div>
            <div className="text-xs text-slate-500">Live · refreshes every 30s</div>
          </div>
          {poll.isFetching && (
            <div className="text-[10px] uppercase text-slate-400">updating…</div>
          )}
        </div>

        {!poll.data && !poll.error && (
          <div className="space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        )}

        {poll.data && (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <CountChip label="Pending" value={counts.pending ?? 0} tone="slate" />
              <CountChip label="Claimed" value={counts.claimed ?? 0} tone="blue" />
              <CountChip label="Overdue" value={counts.overdue ?? 0} tone="red" />
              <CountChip label="Done" value={counts.done ?? 0} tone="emerald" />
            </div>

            <div className="mb-3 text-xs text-slate-600">
              <span className="font-medium text-ehrc-navy">{propagatable}</span> in-flight task{propagatable === 1 ? "" : "s"}{" "}
              {propagatable === 1 ? "is" : "are"} eligible to receive force-propagated edits.
            </div>

            {poll.data.recent.length > 0 && (
              <div className="mb-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Recent (last 5)
                </div>
                <ul className="space-y-1.5 text-xs">
                  {poll.data.recent.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-slate-700">{r.task_name}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${statusTone(r.status)}`}>
                        {r.status}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {new Date(r.due_date).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(true)}
              disabled={propagatable === 0}
              className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              title={propagatable === 0 ? "No in-flight rows to propagate to" : ""}
            >
              Force propagate edits…
            </button>
          </>
        )}
      </div>

      {showModal && (
        <ForcePropagateModal
          templateId={templateId}
          templateSnapshot={templateSnapshot}
          propagatableCount={propagatable}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            poll.refetch();
          }}
        />
      )}
    </aside>
  );
}

function CountChip({ label, value, tone }: { label: string; value: number; tone: "slate" | "blue" | "red" | "emerald" }) {
  const cls = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-ehrc-blue/10 text-ehrc-blue",
    red: "bg-red-100 text-red-800",
    emerald: "bg-emerald-100 text-emerald-800",
  }[tone];
  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-1.5 ${cls}`}>
      <span className="text-[11px]">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function statusTone(status: string): string {
  switch (status) {
    case "claimed": return "bg-ehrc-blue/10 text-ehrc-blue";
    case "done": return "bg-emerald-100 text-emerald-800";
    case "overdue": return "bg-red-100 text-red-800";
    case "skipped": return "bg-amber-100 text-amber-800";
    case "auto_skipped": return "bg-slate-100 text-slate-500 italic";
    default: return "bg-slate-100 text-slate-700";
  }
}
