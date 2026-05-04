"use client";
import { useState } from "react";
import { RenewalModal } from "./RenewalModal";

interface RenewalEntry {
  id: number;
  renewed_at: string;
  previous_expiry: string | null;
  new_expiry: string;
  certificate_url: string | null;
  notes: string | null;
}

interface Props {
  statutoryId: number;
  currentExpiry: string | null;
  daysUntil: number | null;
  history: RenewalEntry[];
}

function tierColor(daysUntil: number | null): string {
  if (daysUntil == null) return "text-slate-500";
  if (daysUntil <= 0) return "text-red-700";
  if (daysUntil < 7) return "text-red-600";
  if (daysUntil < 30) return "text-amber-700";
  return "text-slate-700";
}

export function StatutoryDetailPanel({ statutoryId, currentExpiry, daysUntil, history }: Props) {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-ehrc-navy">Compliance status</div>
        <div className="mt-2 text-2xl font-bold">
          {daysUntil == null ? <span className="text-slate-400">—</span> :
            daysUntil <= 0 ? <span className={tierColor(daysUntil)}>EXPIRED</span> :
            <span className={tierColor(daysUntil)}>{daysUntil}d</span>}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {currentExpiry ? `Current expiry: ${currentExpiry}` : "No current expiry recorded"}
          {daysUntil != null && daysUntil <= 0 && currentExpiry && <> · expired {Math.abs(daysUntil)} day{Math.abs(daysUntil) === 1 ? "" : "s"} ago</>}
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Record renewal
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-ehrc-navy">Renewal history</div>
        {history.length === 0 ? (
          <div className="py-3 text-center text-xs text-slate-500">No renewals recorded yet.</div>
        ) : (
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                <div className="text-xs font-medium text-ehrc-navy">{new Date(h.renewed_at).toLocaleDateString()}</div>
                <div className="text-xs text-slate-600">
                  {h.previous_expiry ? `${h.previous_expiry} → ${h.new_expiry}` : `Set to ${h.new_expiry}`}
                </div>
                {h.notes && <div className="mt-0.5 text-[11px] text-slate-500">{h.notes}</div>}
                {h.certificate_url && <a href={h.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ehrc-blue hover:underline">cert →</a>}
              </li>
            ))}
          </ol>
        )}
      </div>

      {showModal && (
        <RenewalModal
          statutoryId={statutoryId}
          currentExpiry={currentExpiry}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
