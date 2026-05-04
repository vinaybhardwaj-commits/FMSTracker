"use client";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/DataTable";

export interface StatutoryRow {
  id: number;
  licence_id: string | null;
  item: string;
  authority: string | null;
  current_expiry: string | null;
  days_until: number | null;
  active: boolean;
}

function tierColor(daysUntil: number | null): string {
  if (daysUntil == null) return "text-slate-500";
  if (daysUntil <= 0) return "text-red-700 font-semibold";
  if (daysUntil < 7) return "text-red-600 font-semibold";
  if (daysUntil < 30) return "text-amber-700 font-semibold";
  if (daysUntil < 90) return "text-amber-600";
  return "text-slate-600";
}

export function StatutoryTable({ rows }: { rows: StatutoryRow[] }) {
  const router = useRouter();
  const columns: Column<StatutoryRow>[] = [
    { key: "licence_id", label: "ID", accessor: "licence_id", sortable: true, widthClass: "w-20",
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.licence_id ?? "—"}</span> },
    { key: "item", label: "Item", accessor: "item", sortable: true,
      render: (r) => <span className="font-medium text-ehrc-navy">{r.item}</span> },
    { key: "authority", label: "Authority", accessor: "authority", sortable: true, widthClass: "w-40",
      render: (r) => <span className="text-xs text-slate-600">{r.authority ?? "—"}</span> },
    { key: "current_expiry", label: "Expiry", accessor: "current_expiry", sortable: true, widthClass: "w-28",
      render: (r) => r.current_expiry ? <span className="text-xs">{r.current_expiry}</span> : <span className="text-slate-400">—</span> },
    { key: "days_until", label: "Status", accessor: "days_until", sortable: true, widthClass: "w-32",
      render: (r) => {
        if (r.days_until == null) return <span className="text-slate-400">—</span>;
        if (r.days_until <= 0) return <span className={tierColor(r.days_until)}>EXPIRED {Math.abs(r.days_until)}d ago</span>;
        return <span className={tierColor(r.days_until)}>{r.days_until}d remaining</span>;
      } },
    { key: "active", label: "Active", accessor: (r) => (r.active ? 1 : 0), sortable: true, widthClass: "w-20",
      render: (r) => r.active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inactive</span> },
  ];
  return (
    <DataTable<StatutoryRow>
      rows={rows}
      columns={columns}
      rowId={(r) => r.id}
      onRowClick={(r) => router.push(`/admin/statutory/${r.id}` as any)}
      pageSize={50}
      searchPlaceholder="Search by ID, item, or authority…"
      emptyLabel="No statutory items match these filters."
    />
  );
}
