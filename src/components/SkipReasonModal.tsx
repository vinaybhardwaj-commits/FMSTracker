/**
 * src/components/SkipReasonModal.tsx — M1.
 *
 * Bottom sheet, 4 reason chips (radio) + Other (text). Confirm requires
 * non-empty reason (and notes if Other).
 */

"use client";

import { useState, useEffect } from "react";

const REASONS: Array<{ code: string; label: string }> = [
  { code: "not_enough_staff", label: "Not enough staff" },
  { code: "area_in_use", label: "Area in use" },
  { code: "supplies_unavailable", label: "Supplies unavailable" },
  { code: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => Promise<void>;
}

export function SkipReasonModal({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setNotes("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;
  const valid = reason && (reason !== "other" || notes.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center py-2">
          <div className="h-1 w-12 rounded-full bg-slate-300" />
        </div>
        <div className="px-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-ehrc-navy">Why skip this task?</div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-1">
            {REASONS.map((r) => (
              <label
                key={r.code}
                className={`flex h-14 cursor-pointer items-center gap-3 rounded-xl px-3 transition ${
                  reason === r.code ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r.code}
                  onChange={() => setReason(r.code)}
                  className="h-5 w-5"
                />
                <span className="text-base text-ehrc-navy">{r.label}</span>
              </label>
            ))}
            {reason === "other" && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type the reason…"
                autoFocus
                className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none"
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 px-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!valid || submitting) return;
              setSubmitting(true);
              try {
                await onConfirm(reason, notes.trim());
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={!valid || submitting}
            className="flex-1 rounded-xl bg-ehrc-blue px-4 py-3 text-sm font-medium text-white disabled:bg-slate-300"
          >
            {submitting ? "Skipping…" : "Confirm skip"}
          </button>
        </div>
      </div>
    </div>
  );
}
