"use client";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/DataTable";

export interface LocationRow {
  id: number;
  asset_id: string | null;
  system: string;
  name: string;
  floor: string | null;
  sub_location: string | null;
  count: number | null;
  criticality: string | null;
  active: boolean;
  bound_task_count: number;
}

const CRIT_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-amber-100 text-amber-800",
  medium: "bg-slate-100 text-slate-700",
  low: "bg-slate-50 text-slate-500",
};

export function LocationsTable({ rows }: { rows: LocationRow[] }) {
  const router = useRouter();
  const columns: Column<LocationRow>[] = [
    { key: "asset_id", label: "ID", accessor: "asset_id", sortable: true, widthClass: "w-24",
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.asset_id ?? "—"}</span> },
    { key: "name", label: "Name", accessor: "name", sortable: true,
      render: (r) => <span className="font-medium text-ehrc-navy">{r.name}</span> },
    { key: "system", label: "System", accessor: "system", sortable: true, widthClass: "w-28",
      render: (r) => <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">{r.system}</span> },
    { key: "floor", label: "Floor", accessor: "floor", sortable: true, widthClass: "w-20",
      render: (r) => <span className="text-xs text-slate-600">{r.floor ?? "—"}</span> },
    { key: "criticality", label: "Criticality", accessor: "criticality", sortable: true, widthClass: "w-24",
      render: (r) => r.criticality ? <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CRIT_COLOR[r.criticality] ?? "bg-slate-100 text-slate-600"}`}>{r.criticality}</span> : <span className="text-slate-400">—</span> },
    { key: "bound_task_count", label: "Tasks", accessor: "bound_task_count", sortable: true, widthClass: "w-16", numeric: true,
      render: (r) => r.bound_task_count > 0 ? <span className="font-medium text-ehrc-blue">{r.bound_task_count}</span> : <span className="text-slate-400">0</span> },
    { key: "active", label: "Active", accessor: (r) => (r.active ? 1 : 0), sortable: true, widthClass: "w-20",
      render: (r) => r.active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inactive</span> },
  ];
  return (
    <DataTable<LocationRow>
      rows={rows}
      columns={columns}
      rowId={(r) => r.id}
      onRowClick={(r) => router.push(`/admin/locations/${r.id}` as any)}
      pageSize={50}
      searchPlaceholder="Search by ID, name, system, or floor…"
      emptyLabel="No locations match these filters."
    />
  );
}
