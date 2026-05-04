"use client";
import { useState } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";

export interface AuditRow {
  id: number;
  created_at: string;
  changed_by_name: string | null;
  action: string;
  table_name: string;
  record_id: string;
  session_id: string | null;
  diff: Record<string, unknown> | null;
}

const ACTION_BG: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-ehrc-blue/10 text-ehrc-blue",
  delete: "bg-red-100 text-red-800",
  soft_delete: "bg-amber-100 text-amber-800",
  force_propagate: "bg-orange-100 text-orange-800",
  statutory_renew: "bg-violet-100 text-violet-800",
  pin_failure: "bg-slate-200 text-slate-700",
  claim_expired: "bg-slate-100 text-slate-600",
};

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const columns: Column<AuditRow>[] = [
    { key: "created_at", label: "When", accessor: "created_at", sortable: true, widthClass: "w-40",
      render: (r) => <span className="text-xs text-slate-600">{r.created_at}</span> },
    { key: "changed_by_name", label: "Actor", accessor: "changed_by_name", sortable: true, widthClass: "w-28",
      render: (r) => <span className="text-sm text-ehrc-navy">{r.changed_by_name ?? "—"}</span> },
    { key: "action", label: "Action", accessor: "action", sortable: true, widthClass: "w-36",
      render: (r) => <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${ACTION_BG[r.action] ?? "bg-slate-100 text-slate-700"}`}>{r.action.replace(/_/g, " ")}</span> },
    { key: "table_name", label: "Table", accessor: "table_name", sortable: true, widthClass: "w-32",
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.table_name}</span> },
    { key: "record_id", label: "Record", accessor: "record_id", widthClass: "w-32",
      render: (r) => <span className="font-mono text-xs text-slate-500">{r.record_id}</span> },
    { key: "session_id", label: "Session", accessor: "session_id", widthClass: "w-28",
      render: (r) => r.session_id ? <span className="font-mono text-[10px] text-slate-400">{r.session_id.slice(0, 12)}…</span> : <span className="text-slate-300">—</span> },
    { key: "diff", label: "Diff", widthClass: "w-20",
      render: (r) => r.diff ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === r.id ? null : r.id); }}
          className="text-xs text-ehrc-blue hover:underline">
          {expandedId === r.id ? "Hide" : "View"}
        </button>
      ) : <span className="text-slate-300">—</span> },
  ];

  return (
    <div>
      <DataTable<AuditRow>
        rows={rows}
        columns={columns}
        rowId={(r) => r.id}
        pageSize={50}
        searchPlaceholder="Search by actor, action, or record…"
        emptyLabel="No audit events match these filters."
      />
      {expandedId != null && (() => {
        const row = rows.find((r) => r.id === expandedId);
        if (!row) return null;
        return (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-sm font-semibold text-ehrc-navy">Diff for event #{row.id}</div>
              <button type="button" onClick={() => setExpandedId(null)} className="text-xs text-slate-500 hover:text-ehrc-navy">Close</button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-white p-3 text-[11px] text-slate-700">{JSON.stringify(row.diff, null, 2)}</pre>
          </div>
        );
      })()}
    </div>
  );
}
