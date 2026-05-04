import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { LocationsTable, type LocationRow } from "@/components/admin/locations/LocationsTable";

export const dynamic = "force-dynamic";

async function loadLocations(): Promise<{ rows: LocationRow[]; error: string | null }> {
  try {
    const { rows } = await sql`
      SELECT
        l.id, l.asset_id, l.system, l.name, l.floor, l.sub_location,
        l.count, l.criticality, l.active,
        (SELECT COUNT(*)::int FROM task_templates t WHERE t.location_or_asset = l.name OR t.location_or_asset = l.asset_id) AS bound_task_count
      FROM locations l
      ORDER BY l.system, l.asset_id
    `;
    return { rows: rows as LocationRow[], error: null };
  } catch (e) {
    return { rows: [], error: (e as Error).message };
  }
}

export default async function LocationsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/locations"));
  const { rows, error } = await loadLocations();
  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ehrc-navy">Locations</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} location{rows.length === 1 ? "" : "s"} · {rows.filter(r => r.active).length} active</p>
        </div>
        <Link href={"/admin/locations/new" as any} className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90">+ New location</Link>
      </div>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">DB unreachable: {error}</div>}
      <LocationsTable rows={rows} />
    </div>
  );
}
