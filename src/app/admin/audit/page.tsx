/**
 * src/app/admin/audit/page.tsx — S20.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Row {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  changed_by_name: string | null;
  created_at: string;
  diff: Record<string, unknown> | null;
}

const ACTION_BG: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  soft_delete: "bg-amber-100 text-amber-800",
  force_propagate: "bg-orange-100 text-orange-800",
  statutory_renew: "bg-purple-100 text-purple-800",
  pin_failure: "bg-slate-200 text-slate-700",
  claim_expired: "bg-slate-100 text-slate-600",
};

export default function AuditLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [tableFilter, setTableFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  async function load() {
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    if (actionFilter) sp.set("action", actionFilter);
    if (tableFilter) sp.set("table", tableFilter);
    try {
      const r = await fetch(`/api/admin/audit?${sp}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setRows(d.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, tableFilter]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const header = ["timestamp", "action", "table", "record_id", "by", "diff"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        new Date(r.created_at).toISOString(),
        r.action,
        r.table_name,
        r.record_id,
        r.changed_by_name ?? "",
        JSON.stringify(r.diff ?? {}).replace(/"/g, '""'),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fmstracker-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={"/admin" as any} className="text-sm text-slate-500 hover:text-ehrc-navy">◀ Admin</Link>
          <div className="text-2xl font-bold text-ehrc-navy">Audit log</div>
          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{rows.length}</div>
        </div>
        <button onClick={exportCsv} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-ehrc-navy hover:bg-slate-200">
          Export CSV
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="soft_delete">Soft-delete</option>
          <option value="statutory_renew">Statutory renew</option>
          <option value="pin_failure">PIN failure</option>
          <option value="claim_expired">Claim expired</option>
          <option value="force_propagate">Force propagate</option>
        </select>
        <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
          <option value="">All tables</option>
          <option value="task_templates">Task templates</option>
          <option value="task_instances">Task instances</option>
          <option value="statutory_items">Statutory items</option>
          <option value="locations">Locations</option>
          <option value="vendors">Vendors</option>
          <option value="admin_pin">Admin PIN</option>
        </select>
        {(actionFilter || tableFilter) && (
          <button onClick={() => { setActionFilter(""); setTableFilter(""); }} className="text-xs text-slate-500 underline hover:text-ehrc-navy">
            Clear
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading && rows.length === 0 ? (
        <div className="space-y-2" aria-busy>
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white ring-1 ring-slate-200" />)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Table</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-12 text-center text-slate-500">No entries.</td></tr>
              ) : rows.map((r) => (
                <>
                  <tr key={r.id} onClick={() => toggle(r.id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-3 py-2 text-[12px] text-slate-600 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${ACTION_BG[r.action] ?? "bg-slate-100 text-slate-700"}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{r.table_name}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{r.record_id}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-700">{r.changed_by_name ?? "—"}</td>
                  </tr>
                  {expanded.has(r.id) && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-3 py-2">
                        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] text-green-200">
                          {JSON.stringify(r.diff ?? {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
