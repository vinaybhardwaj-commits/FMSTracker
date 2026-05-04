"use client";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/DataTable";

export interface VendorRow {
  id: number;
  vendor_id: string | null;
  system: string;
  vendor_name: string;
  contact_name: string | null;
  phone: string | null;
  visit_cadence: string | null;
  active: boolean;
  bound_task_count: number;
}

export function VendorsTable({ rows }: { rows: VendorRow[] }) {
  const router = useRouter();
  const columns: Column<VendorRow>[] = [
    { key: "vendor_id", label: "ID", accessor: "vendor_id", sortable: true, widthClass: "w-20",
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.vendor_id ?? "—"}</span> },
    { key: "vendor_name", label: "Vendor", accessor: "vendor_name", sortable: true,
      render: (r) => <div><div className="font-medium text-ehrc-navy">{r.vendor_name}</div>{r.contact_name && <div className="text-[11px] text-slate-500">{r.contact_name}</div>}</div> },
    { key: "system", label: "System", accessor: "system", sortable: true, widthClass: "w-28",
      render: (r) => <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">{r.system}</span> },
    { key: "visit_cadence", label: "Cadence", accessor: "visit_cadence", sortable: true, widthClass: "w-32",
      render: (r) => <span className="text-xs text-slate-600">{r.visit_cadence ?? "—"}</span> },
    { key: "phone", label: "Phone", accessor: "phone", widthClass: "w-32",
      render: (r) => r.phone ? <a href={`tel:${r.phone}`} className="text-xs text-ehrc-blue hover:underline" onClick={(e) => e.stopPropagation()}>{r.phone}</a> : <span className="text-slate-400">—</span> },
    { key: "bound_task_count", label: "Tasks", accessor: "bound_task_count", sortable: true, widthClass: "w-16", numeric: true,
      render: (r) => r.bound_task_count > 0 ? <span className="font-medium text-ehrc-blue">{r.bound_task_count}</span> : <span className="text-slate-400">0</span> },
    { key: "active", label: "Active", accessor: (r) => (r.active ? 1 : 0), sortable: true, widthClass: "w-20",
      render: (r) => r.active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inactive</span> },
  ];
  return (
    <DataTable<VendorRow>
      rows={rows}
      columns={columns}
      rowId={(r) => r.id}
      onRowClick={(r) => router.push(`/admin/vendors/${r.id}` as any)}
      pageSize={50}
      searchPlaceholder="Search by ID, name, system, or contact…"
      emptyLabel="No vendors match these filters."
    />
  );
}
