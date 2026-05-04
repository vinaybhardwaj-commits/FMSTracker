"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";

interface Props {
  statutoryId: number;
  currentExpiry: string | null;
  onClose: () => void;
}

export function RenewalModal({ statutoryId, currentExpiry, onClose }: Props) {
  const router = useRouter();
  const [newExpiry, setNewExpiry] = useState("");
  const [certUrl, setCertUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!newExpiry || !/^\d{4}-\d{2}-\d{2}$/.test(newExpiry)) {
      setError("New expiry date is required (YYYY-MM-DD)."); return;
    }
    if (currentExpiry && newExpiry <= currentExpiry) {
      setError("New expiry must be later than current."); return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetchWithAuthCatch(`/api/admin/statutory/${statutoryId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_expiry: newExpiry,
          certificate_url: certUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Renewal failed (${res.status})`); return; }
      onClose();
      router.refresh();
    } catch { setError("Network error — try again"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ehrc-navy">Record renewal</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pushes the previous expiry into renewal history and updates current_expiry.{" "}
          {currentExpiry && <>Current: <span className="font-medium text-ehrc-navy">{currentExpiry}</span></>}
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">New expiry <span className="text-red-500">*</span></span>
            <input type="date" required value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-ehrc-blue focus:outline-none" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">New certificate URL</span>
            <input type="text" value={certUrl} onChange={(e) => setCertUrl(e.target.value)}
              placeholder="Link to renewed cert"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-ehrc-blue focus:outline-none" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-ehrc-blue focus:outline-none" />
          </label>
        </div>

        {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</div>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {submitting ? "Recording…" : "Record renewal"}
          </button>
        </div>
      </div>
    </div>
  );
}
