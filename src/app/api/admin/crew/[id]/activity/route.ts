/**
 * GET /api/admin/crew/[id]/activity — AD1.5
 *
 * Returns last 30 days of task_instances claimed-by or completed-by this device.
 * Plus per-system completion counts for the same window.
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

  const { rows: device } = await sql`
    SELECT id, name, baseline_selfie_url, created_at, last_seen_at
    FROM devices WHERE id = ${id}::uuid
  `;
  if (!device[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const { rows: activity } = await sql`
    SELECT
      ti.id,
      ti.task_name,
      ti.system,
      to_char(ti.due_date, 'YYYY-MM-DD') AS due_date,
      ti.status,
      ti.claimed_at,
      ti.completed_at,
      ti.selfie_url,
      ti.photo_urls,
      ti.skip_reason
    FROM task_instances ti
    WHERE (ti.claimed_by_device = ${id}::uuid OR ti.completed_by_device = ${id}::uuid)
      AND ti.due_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY COALESCE(ti.completed_at, ti.claimed_at, ti.created_at) DESC
    LIMIT 50
  `;

  const { rows: bySystem } = await sql`
    SELECT system, COUNT(*)::int AS count
    FROM task_instances
    WHERE completed_by_device = ${id}::uuid
      AND due_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY system
    ORDER BY count DESC
  `;

  return NextResponse.json({
    ok: true,
    device: device[0],
    activity,
    by_system: bySystem,
  });
}
