/**
 * GET /api/admin/locations/[id]/bound-tasks — AD1.4
 * Returns task_templates whose location_or_asset matches this location's name or asset_id.
 */
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await ctx.params;
  const lid = parseInt(id, 10);
  if (!Number.isFinite(lid)) return NextResponse.json({ ok: false }, { status: 400 });

  const { rows: locRows } = await sql`SELECT asset_id, name FROM locations WHERE id = ${lid}`;
  if (!locRows[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const { asset_id, name } = locRows[0];

  const { rows } = await sql`
    SELECT
      t.id, t.task_id, t.system, t.task_name, t.cadence, t.active,
      COALESCE(SUM(CASE WHEN ti.status IN ('pending','claimed','overdue') THEN 1 ELSE 0 END), 0)::int AS in_flight_count
    FROM task_templates t
    LEFT JOIN task_instances ti ON ti.template_id = t.id
    WHERE t.location_or_asset = ${name}
       OR t.location_or_asset = ${asset_id}
    GROUP BY t.id
    ORDER BY t.priority_weight DESC, t.task_id
  `;
  return NextResponse.json({ ok: true, tasks: rows });
}
