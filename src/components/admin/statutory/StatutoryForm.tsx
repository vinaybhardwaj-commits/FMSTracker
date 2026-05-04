"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormDraft } from "@/lib/use-form-draft";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";
import { DraftRestorePrompt } from "@/components/admin/DraftRestorePrompt";

export interface StatutoryFormValues {
  licence_id: string;
  item: string;
  authority: string;
  current_expiry: string; // YYYY-MM-DD
  current_certificate_url: string;
  source_doc: string;
  notes: string;
  active: boolean;
}

const EMPTY: StatutoryFormValues = {
  licence_id: "", item: "", authority: "", current_expiry: "",
  current_certificate_url: "", source_doc: "", notes: "", active: true,
};

interface Props { statutoryId?: number; initial?: StatutoryFormValues; }

export function StatutoryForm({ statutoryId, initial }: Props) {
  const router = useRouter();
  const isEdit = !!statutoryId;
  const formId = isEdit ? `stat_${statutoryId}` : "stat_new";
  const [form, setForm] = useState<StatutoryFormValues>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const draft = useFormDraft<StatutoryFormValues>(formId, form);

  function set<K extends keyof StatutoryFormValues>(k: K, v: StatutoryFormValues[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const url = isEdit ? `/api/admin/statutory/${statutoryId}` : `/api/admin/statutory`;
      const res = await fetchWithAuthCatch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, licence_id: form.licence_id.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Save failed (${res.status})`); return; }
      draft.clearDraft();
      setSavedToast(`Saved · ${new Date().toLocaleTimeString()}`);
      const newId = data.id ?? data.statutory?.id ?? statutoryId;
      if (!isEdit && newId) router.push(`/admin/statutory/${newId}` as any);
    } catch { setError("Network error — try again"); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {draft.hasDraft && draft.draftSavedAt && (
        <DraftRestorePrompt savedAt={draft.draftSavedAt} onRestore={() => { const r = draft.restoreDraft(); if (r) setForm(r); }} onDiscard={() => draft.discardDraft()} />
      )}
      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Statutory item</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Licence ID" hint={isEdit ? "" : "Leave blank — auto-assigned"}>
            <input className={inp} value={form.licence_id} onChange={(e) => set("licence_id", e.target.value)} placeholder="e.g. S-01" />
          </Field>
          <Field label="Item" required><input className={inp} required value={form.item} onChange={(e) => set("item", e.target.value)} placeholder="e.g. Fire NOC" /></Field>
          <Field label="Authority"><input className={inp} value={form.authority} onChange={(e) => set("authority", e.target.value)} placeholder="e.g. KSFES" /></Field>
          <Field label="Current expiry" hint="When does the current certificate expire?">
            <input type="date" className={inp} value={form.current_expiry} onChange={(e) => set("current_expiry", e.target.value)} />
          </Field>
          <Field label="Current certificate URL" full><input className={inp} value={form.current_certificate_url} onChange={(e) => set("current_certificate_url", e.target.value)} placeholder="Link to current cert PDF / image" /></Field>
          <Field label="Source doc"><input className={inp} value={form.source_doc} onChange={(e) => set("source_doc", e.target.value)} placeholder="Original source / reference" /></Field>
          <Field label="Active">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Surfaces in compliance dashboards + Year view
            </label>
          </Field>
          <Field label="Notes" full><textarea className={inp} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
      </fieldset>
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {savedToast && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{savedToast}</div>}
      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <button type="submit" disabled={submitting} className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90 disabled:opacity-50">
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create statutory item"}
        </button>
        <button type="button" onClick={() => router.push("/admin/statutory" as any)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <div className="ml-auto text-xs text-slate-500">{draft.hasDraft ? "Draft saved" : "Auto-saves draft"}</div>
      </div>
    </form>
  );
}

const inp = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-ehrc-blue focus:outline-none";
function Field({ label, hint, required, full, children }: { label: string; hint?: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <div className="mb-1 text-xs font-medium text-slate-700">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</div>
      {children}
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </label>
  );
}
