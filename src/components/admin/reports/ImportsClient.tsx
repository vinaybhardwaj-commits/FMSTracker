"use client";
import { useState } from "react";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";

interface PreviewResp {
  ok: boolean;
  mode: string;
  total: number;
  valid: number;
  errors: string[];
  preview: Record<string, unknown>[];
}

interface CommitResp { ok: boolean; mode: string; inserted: number; updated: number; }

function parseCsv(text: string): Record<string, string>[] {
  // Lightweight CSV parse — supports quoted strings + escaped quotes.
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuote = false;
      } else { field += c; }
    } else {
      if (c === '"') inQuote = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i += 1;
        cur.push(field); field = "";
        if (cur.length > 0 && !(cur.length === 1 && cur[0] === "")) rows.push(cur);
        cur = [];
      } else { field += c; }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); if (cur.some((c) => c !== "")) rows.push(cur); }
  if (rows.length < 2) return [];
  // Skip lines starting with '#' (comments — our own signature lines)
  const filtered = rows.filter((r) => !(r[0] && r[0].startsWith("#")));
  if (filtered.length < 2) return [];
  const headers = filtered[0].map((h) => h.trim().toLowerCase().replace(/ /g, "_"));
  return filtered.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

export function ImportsClient() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Record<string, string>[] | null>(null);
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(f: File) {
    setFile(f);
    setError(null);
    setPreview(null);
    setCommitResult(null);
    try {
      const text = await f.text();
      const rows = parseCsv(text);
      if (rows.length === 0) { setError("CSV has no data rows."); return; }
      setParsed(rows);
    } catch (e) { setError("Couldn't read file: " + (e as Error).message); }
  }

  async function runPreview() {
    if (!parsed) return;
    setBusy(true); setError(null);
    try {
      const res = await fetchWithAuthCatch("/api/admin/imports/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", rows: parsed }),
      });
      const data = (await res.json()) as PreviewResp;
      setPreview(data);
    } catch { setError("Network error"); }
    finally { setBusy(false); }
  }

  async function runCommit() {
    if (!parsed) return;
    if (!confirm(`Commit ${preview?.valid} task templates? Existing rows with matching task_id will be updated.`)) return;
    setBusy(true); setError(null);
    try {
      const res = await fetchWithAuthCatch("/api/admin/imports/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", rows: parsed }),
      });
      const data = (await res.json()) as CommitResp;
      if (!data.ok) { setError("Commit failed"); return; }
      setCommitResult(data);
    } catch { setError("Network error"); }
    finally { setBusy(false); }
  }

  function reset() {
    setFile(null); setParsed(null); setPreview(null); setCommitResult(null); setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-ehrc-navy">CSV bulk import — Tasks</div>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV with these headers (any order, comments starting with <code className="font-mono text-xs">#</code> are skipped):{" "}
          <code className="font-mono text-xs">task_id, system, task_name, cadence, frequency_in_days, cadence_anchor, actor_type, acceptance_criteria, evidence_required, priority_weight, active, notes</code>.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Rows with a matching <code className="font-mono">task_id</code> are <strong>updated</strong>; rows without are <strong>inserted</strong> (and auto-assigned an FT-### id). Tip: download a current Tasks CSV from Reports → Exports first to seed the format.
        </p>
        <p className="mt-1 text-xs text-amber-700">Locations + Vendors + Statutory imports ship in v1.x.</p>
      </div>

      {!parsed && (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files && onFile(e.target.files[0])} className="hidden" id="csv-input" />
          <label htmlFor="csv-input" className="cursor-pointer rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90">Choose CSV file</label>
          <p className="mt-2 text-xs text-slate-500">or drag-and-drop (drag-drop in v1.x)</p>
        </div>
      )}

      {parsed && !preview && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ehrc-navy">{file?.name}</div>
              <div className="text-xs text-slate-500">{parsed.length} data row{parsed.length === 1 ? "" : "s"} parsed</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={runPreview} disabled={busy} className="rounded-md bg-ehrc-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-ehrc-blue/90 disabled:opacity-50">
                {busy ? "Validating…" : "Validate"}
              </button>
              <button type="button" onClick={reset} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Reset</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ehrc-navy">Preview</div>
              <div className="text-xs text-slate-500">
                <span className="font-medium text-emerald-700">{preview.valid} valid</span> · {preview.errors.length > 0 && <span className="font-medium text-red-700">{preview.errors.length} errors</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {preview.errors.length === 0 && !commitResult && (
                <button type="button" onClick={runCommit} disabled={busy} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {busy ? "Committing…" : `Commit ${preview.valid} rows`}
                </button>
              )}
              <button type="button" onClick={reset} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Reset</button>
            </div>
          </div>
          {preview.errors.length > 0 && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3">
              <div className="text-sm font-medium text-red-800">{preview.errors.length} error{preview.errors.length === 1 ? "" : "s"} — fix and re-upload:</div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-red-700">
                {preview.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                {preview.errors.length > 10 && <li className="text-red-500">… +{preview.errors.length - 10} more</li>}
              </ul>
            </div>
          )}
          {preview.preview.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50"><tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">{Object.keys(preview.preview[0]).slice(0, 6).map((k) => <th key={k} className="px-3 py-1.5 font-normal">{k}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.preview.map((row, i) => (
                    <tr key={i}>{Object.keys(row).slice(0, 6).map((k) => <td key={k} className="px-3 py-1 text-slate-700">{String(row[k] ?? "—").slice(0, 40)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {commitResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-900">Import committed</div>
          <p className="mt-1 text-sm text-emerald-800">
            <span className="font-medium">{commitResult.inserted}</span> inserted · <span className="font-medium">{commitResult.updated}</span> updated
          </p>
          <button type="button" onClick={reset} className="mt-3 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">Import another</button>
        </div>
      )}

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    </div>
  );
}
