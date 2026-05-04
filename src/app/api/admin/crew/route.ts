/**
 * GET /api/admin/crew — AD1.5
 *
 * Lists non-admin devices (crew) with completion stats: total, today, this week,
 * this month + last seen + currently-claimed count.
 */
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const { rows } = await sql`
      SELECT
        d.id, d.device_uuid, d.name, d.baseline_selfie_url, d.created_at, d.last_seen_at,
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
    return NextResponse.json({ ok: true, crew: rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
