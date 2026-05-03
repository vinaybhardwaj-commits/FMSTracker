/**
 * src/components/ReleaseClaimModal.tsx — M2.
 *
 * Bottom sheet, free-text reason required, "logged for review" footnote.
 */

"use client";

import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  claimerName: string | null;
  minutesHeld: number | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function ReleaseClaimModal({ open, claimerName, minutesHeld, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;
  const valid = reason.trim().length > 0;
  const who = claimerName || "the current holder";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center py-2">
          <div className="h-1 w-12 rounded-full bg-slate-300" />
        </div>
        <div className="px-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-ehrc-navy">Release {who}'s claim?</div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          {typeof minutesHeld === "number" && (
            <div className="mt-1 text-[13px] text-slate-600">
              {who} has been on this task for {minutesHeld} min.
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-slate-600">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Ravi went home, can't reach Ravi…"
              autoFocus
              className="min-h-[80px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none"
            />
            <div className="mt-2 text-[11px] text-slate-500">
              This will free the task for anyone to claim. Logged for review.
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 px-6">
          <button onClick={onClose} className="flex-1 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!valid || submitting) return;
              setSubmitting(true);
              try {
                await onConfirm(reason.trim());
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={!valid || submitting}
            className="flex-1 rounded-xl bg-ehrc-blue px-4 py-3 text-sm font-medium text-white disabled:bg-slate-300"
          >
            {submitting ? "Releasing…" : "Release claim"}
          </button>
        </div>
      </div>
    </div>
  );
}
