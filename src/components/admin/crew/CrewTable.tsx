"use client";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/DataTable";

export interface CrewRow {
  id: string;
  device_uuid: string;
  name: string;
  baseline_selfie_url: string | null;
  created_at: string;
  last_seen_at: string;
  done_today: number;
  done_7d: number;
  done_30d: number;
  done_total: number;
  active_claims: number;
  missing_selfie_30d: number;
  missing_photos_30d: number;
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const sec = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

export function CrewTable({ rows }: { rows: CrewRow[] }) {
  const router = useRouter();
  const columns: Column<CrewRow>[] = [
    {
      key: "name",
      label: "Crew member",
      accessor: "name",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          {r.baseline_selfie_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.baseline_selfie_url} alt={r.name} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
              {r.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-medium text-ehrc-navy">{r.name}</span>
        </div>
      ),
    },
    { key: "active_claims", label: "Active", accessor: "active_claims", sortable: true, widthClass: "w-20", numeric: true,
      render: (r) => r.active_claims > 0 ? <span className="font-medium text-ehrc-blue">{r.active_claims}</span> : <span className="text-slate-400">0</span> },
    { key: "done_today", label: "Today", accessor: "done_today", sortable: true, widthClass: "w-16", numeric: true,
      render: (r) => <span className={r.done_today > 0 ? "text-emerald-600 font-medium" : "text-slate-400"}>{r.done_today}</span> },
    { key: "done_7d", label: "7d", accessor: "done_7d", sortable: true, widthClass: "w-16", numeric: true,
      render: (r) => <span className={r.done_7d > 0 ? "text-ehrc-navy" : "text-slate-400"}>{r.done_7d}</span> },
    { key: "done_30d", label: "30d", accessor: "done_30d", sortable: true, widthClass: "w-16", numeric: true,
      render: (r) => <span className={r.done_30d > 0 ? "text-ehrc-navy" : "text-slate-400"}>{r.done_30d}</span> },
    { key: "done_total", label: "Total", accessor: "done_total", sortable: true, widthClass: "w-16", numeric: true,
      render: (r) => <span className="text-slate-700">{r.done_total}</span> },
    { key: "quality", label: "Flags 30d", accessor: (r) => r.missing_selfie_30d + r.missing_photos_30d, sortable: true, widthClass: "w-24",
      render: (r) => {
        const flags = r.missing_selfie_30d + r.missing_photos_30d;
        if (flags === 0) return <span className="text-slate-400">—</span>;
        return <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800" title={`${r.missing_selfie_30d} missing selfie · ${r.missing_photos_30d} missing photos`}>{flags}</span>;
      } },
    { key: "last_seen_at", label: "Last seen", accessor: "last_seen_at", sortable: true, widthClass: "w-24",
      render: (r) => <span className="text-xs text-slate-500">{relTime(r.last_seen_at)} ago</span> },
  ];
  return (
    <DataTable<CrewRow>
      rows={rows}
      columns={columns}
      rowId={(r) => r.id}
      onRowClick={(r) => router.push(`/admin/crew/${r.id}` as any)}
      pageSize={50}
      searchPlaceholder="Search by name…"
      emptyLabel="No crew members onboarded yet."
    />
  );
}
