/**
 * GET /api/admin/vendors/[id]/activity — AD1.4
 *
 * Last 30 days of completed task_instances where this vendor was the AMC vendor.
 * AMC contracts table doesn't exist yet (deferred to v1.x), so activity is
 * derived from task_instances + task_templates JOIN.
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
  const vid = parseInt(id, 10);
  if (!Number.isFinite(vid)) return NextResponse.json({ ok: false }, { status: 400 });

  const { rows } = await sql`
    SELECT
      ti.id,
      ti.task_name,
      ti.system,
      to_char(ti.due_date, 'YYYY-MM-DD') AS due_date,
      ti.status,
      ti.completed_at,
      ti.completed_by_name,
      ti.vendor_next_due_date
    FROM task_instances ti
    INNER JOIN task_templates tt ON tt.id = ti.template_id
    WHERE tt.amc_vendor_id = ${vid}
      AND ti.due_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY ti.due_date DESC, ti.id DESC
    LIMIT 50
  `;
  return NextResponse.json({ ok: true, activity: rows });
}
