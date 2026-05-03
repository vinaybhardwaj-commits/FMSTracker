// src/components/VendorsEditForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Row {
  id?: number;
  vendor_id?: string | null;
  system?: string;
  vendor_name?: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  visit_cadence?: string | null;
  scope_notes?: string | null;
  active?: boolean;
}

export function VendorsEditForm({ initial }: { initial: Row | null }) {
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
      const url = isEdit ? `/api/admin/vendors/${initial!.id}` : "/api/admin/vendors";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      router.push("/admin/vendors" as never); router.refresh();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }

  async function del() {
    if (!isEdit) return;
    setSaving(true);
    try {
      const r2 = await fetch(`/api/admin/vendors/${initial!.id}`, { method: "DELETE" });
      if (!r2.ok) throw new Error("delete failed");
      router.push("/admin/vendors" as never); router.refresh();
    } catch (e) { setError((e as Error).message); setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <a href="/admin/vendors" className="text-sm text-slate-500 hover:text-ehrc-navy">◀ Vendors</a>
      <h1 className="mt-1 text-2xl font-bold text-ehrc-navy">{isEdit ? `Edit · ${initial!.vendor_id ?? `#${initial!.id}`}` : "New vendor"}</h1>
      {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 space-y-3 rounded-xl bg-white p-6 ring-1 ring-slate-200">
        <Field label="Vendor ID" hint="Auto-generated for new (V-NN)"><input value={r.vendor_id ?? ""} onChange={(e) => field("vendor_id", e.target.value)} className={inputCls} placeholder="V-XX" /></Field>
        <Field label="System" required><input value={r.system ?? ""} onChange={(e) => field("system", e.target.value)} className={inputCls} required /></Field>
        <Field label="Vendor name" required><input value={r.vendor_name ?? ""} onChange={(e) => field("vendor_name", e.target.value)} className={inputCls} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact name"><input value={r.contact_name ?? ""} onChange={(e) => field("contact_name", e.target.value)} className={inputCls} /></Field>
          <Field label="Phone"><input value={r.phone ?? ""} onChange={(e) => field("phone", e.target.value)} className={inputCls} placeholder="+91 ..." /></Field>
        </div>
        <Field label="Email"><input type="email" value={r.email ?? ""} onChange={(e) => field("email", e.target.value)} className={inputCls} /></Field>
        <Field label="Visit cadence"><input value={r.visit_cadence ?? ""} onChange={(e) => field("visit_cadence", e.target.value)} className={inputCls} placeholder="e.g., Annual / Monthly" /></Field>
        <Field label="Scope notes"><textarea value={r.scope_notes ?? ""} onChange={(e) => field("scope_notes", e.target.value)} className={`${inputCls} min-h-[60px]`} /></Field>
        <Field label="Active"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={r.active ?? true} onChange={(e) => field("active", e.target.checked)} /><span className="text-sm">{r.active ?? true ? "Active" : "Soft-deleted"}</span></label></Field>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>{isEdit && (confirmDel ? <div className="flex items-center gap-2"><span className="text-sm text-red-700">Soft-delete?</span><button onClick={del} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">Confirm</button><button onClick={() => setConfirmDel(false)} className="text-sm text-slate-500">Cancel</button></div> : <button onClick={() => setConfirmDel(true)} className="text-sm text-red-600 hover:underline">Soft-delete</button>)}</div>
        <div className="flex items-center gap-2"><a href="/admin/vendors" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</a><button onClick={save} disabled={saving} className="rounded-lg bg-ehrc-blue px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving…" : isEdit ? "Save" : "Create"}</button></div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none";
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) { return <div><label className="mb-1 block text-xs font-medium text-slate-600">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>{children}{hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}</div>; }
