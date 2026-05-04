"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormDraft } from "@/lib/use-form-draft";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";
import { DraftRestorePrompt } from "@/components/admin/DraftRestorePrompt";

export interface LocationFormValues {
  asset_id: string;
  system: string;
  name: string;
  floor: string;
  sub_location: string;
  count: number | null;
  criticality: string;
  notes: string;
  active: boolean;
}

const EMPTY: LocationFormValues = {
  asset_id: "", system: "", name: "", floor: "", sub_location: "",
  count: null, criticality: "", notes: "", active: true,
};

const CRIT = ["", "critical", "high", "medium", "low"];

interface Props {
  locationId?: number;
  initial?: LocationFormValues;
}

export function LocationForm({ locationId, initial }: Props) {
  const router = useRouter();
  const isEdit = !!locationId;
  const formId = isEdit ? `loc_${locationId}` : "loc_new";
  const [form, setForm] = useState<LocationFormValues>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const draft = useFormDraft<LocationFormValues>(formId, form);

  function set<K extends keyof LocationFormValues>(k: K, v: LocationFormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = isEdit ? `/api/admin/locations/${locationId}` : `/api/admin/locations`;
      const res = await fetchWithAuthCatch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, asset_id: form.asset_id.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      draft.clearDraft();
      setSavedToast(`Saved · ${new Date().toLocaleTimeString()}`);
      const newId = data.id ?? data.location?.id ?? locationId;
      if (!isEdit && newId) router.push(`/admin/locations/${newId}` as any);
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {draft.hasDraft && draft.draftSavedAt && (
        <DraftRestorePrompt savedAt={draft.draftSavedAt} onRestore={() => { const r = draft.restoreDraft(); if (r) setForm(r); }} onDiscard={() => draft.discardDraft()} />
      )}
      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Location</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Asset ID" hint={isEdit ? "" : "Leave blank — auto-assigned"}>
            <input className={inp} value={form.asset_id} onChange={(e) => set("asset_id", e.target.value)} placeholder="e.g. L-001" />
          </Field>
          <Field label="Name" required>
            <input className={inp} required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="System" required>
            <input className={inp} required value={form.system} onChange={(e) => set("system", e.target.value)} />
          </Field>
          <Field label="Floor">
            <input className={inp} value={form.floor} onChange={(e) => set("floor", e.target.value)} placeholder="GF, 1F, B1, …" />
          </Field>
          <Field label="Sub-location">
            <input className={inp} value={form.sub_location} onChange={(e) => set("sub_location", e.target.value)} />
          </Field>
          <Field label="Count">
            <input type="number" className={inp} value={form.count ?? ""} onChange={(e) => set("count", e.target.value === "" ? null : parseInt(e.target.value, 10))} />
          </Field>
          <Field label="Criticality">
            <select className={inp} value={form.criticality} onChange={(e) => set("criticality", e.target.value)}>
              {CRIT.map((c) => <option key={c} value={c}>{c || "(none)"}</option>)}
            </select>
          </Field>
          <Field label="Active">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Generates new tasks
            </label>
          </Field>
          <Field label="Notes" full>
            <textarea className={inp} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </fieldset>
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {savedToast && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{savedToast}</div>}
      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <button type="submit" disabled={submitting} className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90 disabled:opacity-50">
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create location"}
        </button>
        <button type="button" onClick={() => router.push("/admin/locations" as any)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <div className="ml-auto text-xs text-slate-500">{draft.hasDraft ? "Draft saved" : "Auto-saves draft"}</div>
      </div>
    </form>
  );
}

const inp = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-ehrc-blue focus:outline-none";

function Field({ label, hint, required, full, children }: { label: string; hint?: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <div className="mb-1 text-xs font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </div>
      {children}
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </label>
  );
}
