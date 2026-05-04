"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ReportTypeMeta, ReportFormat } from "@/lib/reports";

interface Props {
  meta: ReportTypeMeta;
}

export function ReportParametersForm({ meta }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [system, setSystem] = useState("");
  const [quarter, setQuarter] = useState("");
  const [format, setFormat] = useState<ReportFormat>(meta.formats[0]);

  const queryStr = useMemo(() => {
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (system) sp.set("system", system);
    if (quarter && meta.type === "compliance_summary") sp.set("quarter", quarter);
    return sp.toString();
  }, [from, to, system, quarter, meta.type]);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (format === "pdf") {
      router.push(`/admin/reports/print/${meta.type}?${queryStr}` as any);
    } else {
      // CSV: server endpoint streams as download
      window.location.href = `/api/admin/reports/csv/${meta.type}?${queryStr}`;
    }
  }

  const showQuarter = meta.type === "compliance_summary";

  return (
    <form onSubmit={handleGenerate} className="space-y-5">
      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Parameters</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Date from"><input type="date" className={inp} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Date to"><input type="date" className={inp} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          {meta.type === "task_completions" && (
            <Field label="System filter (optional)" full>
              <input className={inp} value={system} onChange={(e) => setSystem(e.target.value)} placeholder="e.g. Fire Safety, Electrical, MGPS — leave blank for all" />
            </Field>
          )}
          {showQuarter && (
            <Field label="Quarter (overrides date range)" full>
              <input className={inp} value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="e.g. 2026Q1" />
              <div className="mt-1 text-[11px] text-slate-500">Format: YYYYQN. If set, the date range is ignored.</div>
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Format</legend>
        <div className="flex gap-2">
          {meta.formats.map((f) => (
            <label key={f} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${format === f ? "border-ehrc-blue bg-ehrc-blue/5 text-ehrc-blue" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
              <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} />
              <span className="font-mono text-[11px] uppercase">{f}</span>
              {f === "pdf" && <span className="text-xs">· print-styled HTML, Cmd-P</span>}
              {f === "csv" && <span className="text-xs">· UTF-8 with BOM, Excel-friendly</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <button type="submit" className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90">
          Generate {format.toUpperCase()}
        </button>
        <div className="ml-auto text-xs text-slate-500">
          {format === "pdf" ? "Opens print-friendly page → Cmd-P → Save as PDF" : "Downloads .csv directly"}
        </div>
      </div>
    </form>
  );
}

const inp = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-ehrc-blue focus:outline-none";
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <div className="mb-1 text-xs font-medium text-slate-700">{label}</div>
      {children}
    </label>
  );
}
