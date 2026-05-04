/**
 * src/app/admin/(v2)/crew/page.tsx — AD1.5
 *
 * Crew list — non-admin devices with completion stats. Direct DB query;
 * /api/admin/crew exists for client-side polling refresh in v1.x.
 */

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { CrewTable, type CrewRow } from "@/components/admin/crew/CrewTable";

export const dynamic = "force-dynamic";

async function loadCrew(): Promise<{ rows: CrewRow[]; error: string | null }> {
  try {
    const { rows } = await sql`
      SELECT
        d.id::text AS id, d.device_uuid, d.name, d.baseline_selfie_url,
        d.created_at, d.last_seen_at,
        COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date = CURRENT_DATE)::int AS done_today,
        COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date >= CURRENT_DATE - INTERVAL '7 days')::int AS done_7d,
        COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date >= CURRENT_DATE - INTERVAL '30 days')::int AS done_30d,
        COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id)::int AS done_total,
        COUNT(ti.*) FILTER (WHERE ti.claimed_by_device = d.id AND ti.status = 'claimed')::int AS active_claims,
        COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date >= CURRENT_DATE - INTERVAL '30 days' AND (ti.selfie_url IS NULL OR ti.selfie_url = ''))::int AS missing_selfie_30d,
        COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date >= CURRENT_DATE - INTERVAL '30 days' AND (ti.photo_urls IS NULL OR array_length(ti.photo_urls, 1) = 0))::int AS missing_photos_30d
      FROM devices d
      LEFT JOIN task_instances ti
        ON (ti.completed_by_device = d.id OR (ti.claimed_by_device = d.id AND ti.status = 'claimed'))
      WHERE d.is_admin = FALSE
      GROUP BY d.id
      ORDER BY d.last_seen_at DESC NULLS LAST
    `;
    return { rows: rows as unknown as CrewRow[], error: null };
  } catch (e) {
    return { rows: [], error: (e as Error).message };
  }
}

export default async function CrewPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/crew"));
  const { rows, error } = await loadCrew();
  const activeNow = rows.filter((r) => r.active_claims > 0).length;
  const flagged = rows.filter((r) => r.missing_selfie_30d + r.missing_photos_30d > 0).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">Crew</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} crew member{rows.length === 1 ? "" : "s"}
          {activeNow > 0 && (
            <> · <span className="font-medium text-ehrc-blue">{activeNow} active right now</span></>
          )}
          {flagged > 0 && (
            <> · <span className="font-medium text-amber-700">{flagged} with quality flags</span></>
          )}
        </p>
      </div>
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          DB unreachable: {error}
        </div>
      )}
      <CrewTable rows={rows} />
    </div>
  );
}
