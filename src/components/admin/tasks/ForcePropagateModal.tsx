/**
 * src/components/admin/tasks/ForcePropagateModal.tsx — AD1.2
 *
 * Modal that prompts V to confirm force-propagation. Lets V check exactly
 * which fields to overwrite on in-flight task_instances. Audit-logs every
 * propagate (server-side via /force-propagate route).
 *
 * For v1.0 we don't require PIN re-entry inside the modal — the PIN session
 * itself is the auth gate, plus override audit fingerprint + 4-extension cap
 * + 30-min TTL keep this within acceptable risk for V + Charan.
 */

"use client";

import { useState } from "react";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";

const PROPAGATABLE_FIELDS = [
  { key: "task_name", label: "Task name" },
  { key: "system", label: "System" },
  { key: "location_or_asset", label: "Location / Asset" },
  { key: "acceptance_criteria", label: "Acceptance criteria" },
  { key: "evidence_required", label: "Evidence required" },
  { key: "priority_weight", label: "Priority weight" },
  { key: "amc_vendor_id", label: "AMC vendor" },
] as const;

interface Props {
  templateId: number;
  templateSnapshot: Record<string, unknown>;
  propagatableCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ForcePropagateModal({ templateId, templateSnapshot, propagatableCount, onClose, onSuccess }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(field: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(field);
      else next.delete(field);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      setError("Pick at least one field to propagate.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuthCatch(`/api/admin/templates/${templateId}/force-propagate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: Array.from(selected), reason: reason.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Propagate failed (${res.status})`);
        return;
      }
      onSuccess();
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-ehrc-navy">Force propagate edits</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pick which fields to push onto the{" "}
            <span className="font-semibold text-ehrc-navy">{propagatableCount}</span> in-flight task instance{propagatableCount === 1 ? "" : "s"}.
            Cadence and frequency changes never propagate — they apply only to future engine generations.
          </p>
        </div>

        <div className="mb-4 space-y-2 rounded-md border border-slate-200 p-3">
          {PROPAGATABLE_FIELDS.map((f) => (
            <label key={f.key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(f.key)}
                onChange={(e) => toggle(f.key, e.target.checked)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-ehrc-navy">{f.label}</div>
                <div className="text-xs text-slate-500 truncate" title={String(templateSnapshot[f.key] ?? "")}>
                  Will overwrite with: {String(templateSnapshot[f.key] ?? "—").slice(0, 80)}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">Reason (optional, audit-logged)</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. corrected acceptance criteria after walkthrough"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-ehrc-blue focus:outline-none"
            />
          </label>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? "Propagating…" : `Propagate ${selected.size} field${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
