/**
 * src/app/admin/statutory/[id]/renew/page.tsx — S19 renewal flow.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { compressImage, PHOTO_OPTS } from "@/lib/image";
import { blobToDataUrl } from "@/lib/capture-state";

interface Item {
  id: number;
  licence_id: string | null;
  item: string;
  current_expiry: string | null;
}

function todayIso(): string { return new Date().toISOString().slice(0, 10); }

export default function RenewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = parseInt(params.id, 10);
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [certBlob, setCertBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyCert, setBusyCert] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/statutory-public/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => setItem(d.item))
      .catch(() => {
        // Fallback: query via dashboard data
        fetch("/api/dashboard").then((r) => r.json()).then((p) => {
          const found = (p.statutory ?? []).find((s: any) => s.id === id);
          if (found) setItem({ id: found.id, licence_id: found.licence_id, item: found.item, current_expiry: found.current_expiry });
          else setError("Couldn't load this licence.");
        }).catch((e) => setError((e as Error).message));
      });
  }, [id]);

  async function handleCert(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusyCert(true);
    try {
      const c = await compressImage(f, PHOTO_OPTS);
      setCertBlob(c);
      setCertPreview(await blobToDataUrl(c));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyCert(false);
    }
  }

  async function submit() {
    if (submitting) return;
    if (!newExpiry || newExpiry <= todayIso()) {
      setError("Pick a new expiry date in the future.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let certUrl: string | undefined;
      if (certBlob) {
        const form = new FormData();
        form.append("file", new File([certBlob], "cert.jpg", { type: "image/jpeg" }));
        form.append("prefix", "vendor");
        const upRes = await fetch("/api/upload-image", { method: "POST", body: form });
        if (!upRes.ok) throw new Error("Certificate upload failed");
        certUrl = (await upRes.json()).url;
      }
      const r = await fetch(`/api/admin/statutory/${id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_expiry: newExpiry, certificate_url: certUrl, notes }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      router.push("/admin/statutory" as never);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-6">
      <a href="/admin/statutory" className="text-sm text-slate-500 hover:text-ehrc-navy">◀ Statutory</a>
      <h1 className="mt-1 text-2xl font-bold text-ehrc-navy">Log a renewal</h1>

      {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!item ? (
        <div className="mt-4 text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="mt-6 space-y-4 rounded-xl bg-white p-6 ring-1 ring-slate-200">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Licence</div>
            <div className="mt-1 text-lg font-semibold text-ehrc-navy">{item.item}</div>
            <div className="text-[12px] text-slate-500">{item.licence_id ?? `#${item.id}`}</div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600">Previous expiry</div>
            <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{item.current_expiry ?? "— not set"}</div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">New certificate (optional)</label>
            <div className="flex items-center gap-3">
              {certPreview ? (
                <img src={certPreview} alt="Cert" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">📄</div>
              )}
              <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm text-ehrc-navy hover:bg-slate-200">
                {busyCert ? "Processing…" : certPreview ? "Replace" : "Upload photo"}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCert} />
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">New expiry date <span className="text-red-500">*</span></label>
            <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <a href="/admin/statutory" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</a>
            <button onClick={submit} disabled={submitting || !newExpiry} className="rounded-lg bg-ehrc-blue px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {submitting ? "Saving…" : "Submit renewal"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
