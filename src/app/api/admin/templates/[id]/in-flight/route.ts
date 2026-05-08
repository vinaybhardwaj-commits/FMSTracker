/**
 * GET /api/admin/templates/[id]/in-flight — AD1.2
 *
 * Returns counts of in-flight task_instances by status + 5 most-recent samples.
 * Used by the edit form's <InFlightImpactPanel> to inform the force-propagate
 * decision.
 */
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await ctx.params;
  const tid = parseInt(id, 10);
  if (!Number.isFinite(tid)) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });

  const { rows: counts } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'claimed')::int AS claimed,
      COUNT(*) FILTER (WHERE status = 'done')::int AS done,
      COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue,
      COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
      COUNT(*) FILTER (WHERE status = 'auto_skipped')::int AS auto_skipped,
      COUNT(*) FILTER (WHERE status IN ('pending','claimed','overdue'))::int AS propagatable,
      COUNT(*)::int AS total
    FROM task_instances
    WHERE template_id = ${tid}
  `;

  const { rows: recent } = await sql`
    SELECT id, task_name, system, due_date, status, claimed_by_device, claim_expires_at
    FROM task_instances
    WHERE template_id = ${tid}
    ORDER BY due_date DESC, id DESC
    LIMIT 5
  `;

  return NextResponse.json({
    ok: true,
    template_id: tid,
    counts: counts[0] ?? {},
    recent,
  });
}
