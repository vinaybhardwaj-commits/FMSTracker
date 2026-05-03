/**
 * src/components/StatutoryEditForm.tsx — S18 edit + new.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Row {
  id: number;
  licence_id: string | null;
  item: string;
  authority: string | null;
  current_expiry: string | null;
  source_doc: string | null;
  notes: string | null;
  active: boolean;
}

interface Props {
  initial: Row | null;
}

export function StatutoryEditForm({ initial }: Props) {
  const router = useRouter();
  const isEdit = initial !== null;
  const [licenceId, setLicenceId] = useState(initial?.licence_id ?? "");
  const [item, setItem] = useState(initial?.item ?? "");
  const [authority, setAuthority] = useState(initial?.authority ?? "");
  const [expiry, setExpiry] = useState(initial?.current_expiry ?? "");
  const [sourceDoc, setSourceDoc] = useState(initial?.source_doc ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/admin/statutory/${initial!.id}` : "/api/admin/statutory";
      const method = isEdit ? "PATCH" : "POST";
      const body = JSON.stringify({
        licence_id: licenceId || undefined,
        item, authority, current_expiry: expiry,
        source_doc: sourceDoc, notes, active,
      });
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      router.push("/admin/statutory" as never);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function softDelete() {
    if (!initial) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/statutory/${initial.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("delete failed");
      router.push("/admin/statutory" as never);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <a href="/admin/statutory" className="text-sm text-slate-500 hover:text-ehrc-navy">◀ Statutory</a>
        <div className="mt-1 text-2xl font-bold text-ehrc-navy">
          {isEdit ? `Edit · ${initial?.licence_id ?? `#${initial?.id}`}` : "New licence"}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-4 rounded-xl bg-white p-6 ring-1 ring-slate-200">
        <Row label="Licence ID" hint="Auto-generated for new (S-NN)">
          <input value={licenceId} onChange={(e) => setLicenceId(e.target.value)} className={inputCls} placeholder="S-XX" />
        </Row>
        <Row label="Item" required>
          <input value={item} onChange={(e) => setItem(e.target.value)} className={inputCls} required placeholder="e.g., Fire NOC" />
        </Row>
        <Row label="Authority">
          <input value={authority} onChange={(e) => setAuthority(e.target.value)} className={inputCls} placeholder="e.g., Karnataka State Fire & Emergency Services" />
        </Row>
        <Row label="Current expiry" hint="When does the existing licence expire?">
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputCls} />
        </Row>
        <Row label="Source doc">
          <input value={sourceDoc} onChange={(e) => setSourceDoc(e.target.value)} className={inputCls} placeholder="e.g., FireAdvice_2025_06.pdf" />
        </Row>
        <Row label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} min-h-[60px]`} />
        </Row>
        <Row label="Active">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm text-slate-700">{active ? "Tracked" : "Soft-deleted"}</span>
          </label>
        </Row>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {isEdit && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700">Soft-delete?</span>
                <button onClick={softDelete} disabled={saving} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">Confirm</button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm text-slate-500">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-600 hover:underline">Soft-delete</button>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/statutory" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</a>
          <button onClick={save} disabled={saving} className="rounded-lg bg-ehrc-blue px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : isEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none";

function Row({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
