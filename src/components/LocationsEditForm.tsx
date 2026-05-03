// src/components/LocationsEditForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Row {
  id?: number;
  asset_id?: string | null;
  system?: string;
  name?: string;
  floor?: string | null;
  sub_location?: string | null;
  count?: number | null;
  criticality?: string | null;
  notes?: string | null;
  active?: boolean;
}

export function LocationsEditForm({ initial }: { initial: Row | null }) {
  const router = useRouter();
  const isEdit = initial !== null && initial.id != null;
  const [r, setR] = useState<Row>(initial ?? { active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  function field(key: keyof Row, value: any) { setR({ ...r, [key]: value }); }

  async function save() {
    setSaving(true); setError(null);
    try {
      const url = isEdit ? `/api/admin/locations/${initial!.id}` : "/api/admin/locations";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      router.push("/admin/locations" as never); router.refresh();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }

  async function del() {
    if (!isEdit) return;
    setSaving(true);
    try {
      const r2 = await fetch(`/api/admin/locations/${initial!.id}`, { method: "DELETE" });
      if (!r2.ok) throw new Error("delete failed");
      router.push("/admin/locations" as never); router.refresh();
    } catch (e) { setError((e as Error).message); setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <a href="/admin/locations" className="text-sm text-slate-500 hover:text-ehrc-navy">◀ Locations</a>
      <h1 className="mt-1 text-2xl font-bold text-ehrc-navy">{isEdit ? `Edit · ${initial!.asset_id ?? `#${initial!.id}`}` : "New location"}</h1>
      {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 space-y-3 rounded-xl bg-white p-6 ring-1 ring-slate-200">
        <Field label="Asset ID" hint="Auto-generated for new (L-NNN)"><input value={r.asset_id ?? ""} onChange={(e) => field("asset_id", e.target.value)} className={inputCls} placeholder="L-XXX" /></Field>
        <Field label="System" required><input value={r.system ?? ""} onChange={(e) => field("system", e.target.value)} className={inputCls} required /></Field>
        <Field label="Name" required><input value={r.name ?? ""} onChange={(e) => field("name", e.target.value)} className={inputCls} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Floor"><input value={r.floor ?? ""} onChange={(e) => field("floor", e.target.value)} className={inputCls} /></Field>
          <Field label="Sub-location"><input value={r.sub_location ?? ""} onChange={(e) => field("sub_location", e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Count"><input type="number" value={r.count ?? ""} onChange={(e) => field("count", e.target.value === "" ? null : parseInt(e.target.value, 10))} className={inputCls} /></Field>
          <Field label="Criticality">
            <select value={r.criticality ?? ""} onChange={(e) => field("criticality", e.target.value || null)} className={inputCls}>
              <option value="">—</option><option value="critical">critical</option><option value="high">high</option><option value="medium">medium</option><option value="low">low</option>
            </select>
          </Field>
        </div>
        <Field label="Notes"><textarea value={r.notes ?? ""} onChange={(e) => field("notes", e.target.value)} className={`${inputCls} min-h-[60px]`} /></Field>
        <Field label="Active"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={r.active ?? true} onChange={(e) => field("active", e.target.checked)} /><span className="text-sm">{r.active ?? true ? "Active" : "Soft-deleted"}</span></label></Field>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>{isEdit && (confirmDel ? <div className="flex items-center gap-2"><span className="text-sm text-red-700">Soft-delete?</span><button onClick={del} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">Confirm</button><button onClick={() => setConfirmDel(false)} className="text-sm text-slate-500">Cancel</button></div> : <button onClick={() => setConfirmDel(true)} className="text-sm text-red-600 hover:underline">Soft-delete</button>)}</div>
        <div className="flex items-center gap-2"><a href="/admin/locations" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</a><button onClick={save} disabled={saving} className="rounded-lg bg-ehrc-blue px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving…" : isEdit ? "Save" : "Create"}</button></div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none";
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) { return <div><label className="mb-1 block text-xs font-medium text-slate-600">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>{children}{hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}</div>; }
