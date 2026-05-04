"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormDraft } from "@/lib/use-form-draft";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";
import { DraftRestorePrompt } from "@/components/admin/DraftRestorePrompt";

export interface VendorFormValues {
  vendor_id: string;
  system: string;
  vendor_name: string;
  contact_name: string;
  phone: string;
  email: string;
  visit_cadence: string;
  scope_notes: string;
  active: boolean;
}

const EMPTY: VendorFormValues = {
  vendor_id: "", system: "", vendor_name: "", contact_name: "",
  phone: "", email: "", visit_cadence: "", scope_notes: "", active: true,
};

interface Props { vendorId?: number; initial?: VendorFormValues; }

export function VendorForm({ vendorId, initial }: Props) {
  const router = useRouter();
  const isEdit = !!vendorId;
  const formId = isEdit ? `vendor_${vendorId}` : "vendor_new";
  const [form, setForm] = useState<VendorFormValues>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const draft = useFormDraft<VendorFormValues>(formId, form);

  function set<K extends keyof VendorFormValues>(k: K, v: VendorFormValues[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = isEdit ? `/api/admin/vendors/${vendorId}` : `/api/admin/vendors`;
      const res = await fetchWithAuthCatch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vendor_id: form.vendor_id.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Save failed (${res.status})`); return; }
      draft.clearDraft();
      setSavedToast(`Saved · ${new Date().toLocaleTimeString()}`);
      const newId = data.id ?? data.vendor?.id ?? vendorId;
      if (!isEdit && newId) router.push(`/admin/vendors/${newId}` as any);
    } catch { setError("Network error — try again"); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {draft.hasDraft && draft.draftSavedAt && (
        <DraftRestorePrompt savedAt={draft.draftSavedAt} onRestore={() => { const r = draft.restoreDraft(); if (r) setForm(r); }} onDiscard={() => draft.discardDraft()} />
      )}
      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vendor</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Vendor ID" hint={isEdit ? "" : "Leave blank — auto-assigned"}>
            <input className={inp} value={form.vendor_id} onChange={(e) => set("vendor_id", e.target.value)} placeholder="e.g. V-01" />
          </Field>
          <Field label="Vendor name" required><input className={inp} required value={form.vendor_name} onChange={(e) => set("vendor_name", e.target.value)} /></Field>
          <Field label="System" required><input className={inp} required value={form.system} onChange={(e) => set("system", e.target.value)} /></Field>
          <Field label="Visit cadence"><input className={inp} value={form.visit_cadence} onChange={(e) => set("visit_cadence", e.target.value)} placeholder="e.g. monthly, quarterly" /></Field>
          <Field label="Contact name"><input className={inp} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
          <Field label="Phone"><input className={inp} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><input type="email" className={inp} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Active">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Available for AMC tasks
            </label>
          </Field>
          <Field label="Scope notes" full><textarea className={inp} rows={3} value={form.scope_notes} onChange={(e) => set("scope_notes", e.target.value)} placeholder="What does this vendor cover?" /></Field>
        </div>
      </fieldset>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <span className="font-medium text-ehrc-navy">AMC contract tracking</span> (start/end dates, contract value, document upload) ships in v1.x. For now, vendor identity + contact info covers most workflows.
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {savedToast && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{savedToast}</div>}
      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <button type="submit" disabled={submitting} className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90 disabled:opacity-50">
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create vendor"}
        </button>
        <button type="button" onClick={() => router.push("/admin/vendors" as any)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
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
