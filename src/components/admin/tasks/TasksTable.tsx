/**
 * src/components/admin/tasks/TasksTable.tsx — AD1.2
 *
 * Client component that renders the Tasks list via <DataTable>. Handles
 * bulk-activate / bulk-deactivate via /api/admin/templates/bulk.
 */

"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column, type BulkAction } from "@/components/admin/DataTable";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";

export interface TaskRow {
  id: number;
  task_id: string | null;
  system: string;
  task_name: string;
  cadence: string;
  cadence_anchor: string | null;
  active: boolean;
  draft_status: string;
  priority_weight: number;
  updated_at: string;
  in_flight_count: number;
}

interface Props {
  rows: TaskRow[];
}

export function TasksTable({ rows }: Props) {
  const router = useRouter();

  const columns: Column<TaskRow>[] = [
    {
      key: "task_id",
      label: "ID",
      accessor: "task_id",
      sortable: true,
      widthClass: "w-24",
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.task_id ?? "—"}</span>,
    },
    {
      key: "system",
      label: "System",
      accessor: "system",
      sortable: true,
      widthClass: "w-24",
      render: (r) => (
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
          {r.system}
        </span>
      ),
    },
    {
      key: "task_name",
      label: "Task name",
      accessor: "task_name",
      sortable: true,
      render: (r) => <span className="font-medium text-ehrc-navy">{r.task_name}</span>,
    },
    {
      key: "cadence",
      label: "Cadence",
      accessor: "cadence",
      sortable: true,
      widthClass: "w-32",
      render: (r) => (
        <div>
          <div className="text-sm text-slate-700">{r.cadence}</div>
          {r.cadence_anchor && <div className="text-[11px] text-slate-500 truncate">{r.cadence_anchor}</div>}
        </div>
      ),
    },
    {
      key: "priority_weight",
      label: "Priority",
      accessor: "priority_weight",
      sortable: true,
      widthClass: "w-20",
      numeric: true,
    },
    {
      key: "in_flight_count",
      label: "In-flight",
      accessor: "in_flight_count",
      sortable: true,
      widthClass: "w-20",
      numeric: true,
      render: (r) =>
        r.in_flight_count > 0 ? (
          <span className="font-medium text-ehrc-blue">{r.in_flight_count}</span>
        ) : (
          <span className="text-slate-400">0</span>
        ),
    },
    {
      key: "active",
      label: "Active",
      accessor: (r) => (r.active ? 1 : 0),
      sortable: true,
      widthClass: "w-20",
      render: (r) =>
        r.active ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Inactive</span>
        ),
    },
    {
      key: "updated_at",
      label: "Updated",
      accessor: "updated_at",
      sortable: true,
      widthClass: "w-32",
      render: (r) => <span className="text-xs text-slate-500">{new Date(r.updated_at).toLocaleDateString()}</span>,
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      label: "Activate",
      onClick: async (ids) => {
        await fetchWithAuthCatch("/api/admin/templates/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: ids.map(Number), action: "activate" }),
        });
        router.refresh();
      },
    },
    {
      label: "Deactivate",
      variant: "danger",
      onClick: async (ids) => {
        await fetchWithAuthCatch("/api/admin/templates/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: ids.map(Number), action: "deactivate" }),
        });
        router.refresh();
      },
    },
  ];

  return (
    <DataTable<TaskRow>
      rows={rows}
      columns={columns}
      rowId={(r) => r.id}
      onRowClick={(r) => router.push(`/admin/tasks/${r.id}` as any)}
      bulkActions={bulkActions}
      pageSize={50}
      searchPlaceholder="Search by task ID, name, or system…"
      emptyLabel="No task templates match these filters."
    />
  );
}
