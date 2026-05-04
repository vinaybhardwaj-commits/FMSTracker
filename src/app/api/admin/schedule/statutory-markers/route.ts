/**
 * GET /api/admin/schedule/statutory-markers?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns statutory_items.current_expiry dates within the range. Used by the
 * Year view to surface compliance markers — these are stored dates, not
 * projections, so they don't violate V's "show only generated" lock.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ ok: false, error: "bad_range" }, { status: 400 });
  }

  try {
    const { rows } = await sql`
      SELECT id, licence_id, item, authority, to_char(current_expiry, 'YYYY-MM-DD') AS current_expiry,
        (current_expiry - CURRENT_DATE)::int AS days_until
      FROM statutory_items
      WHERE active = TRUE
        AND current_expiry IS NOT NULL
        AND current_expiry BETWEEN ${from} AND ${to}
      ORDER BY current_expiry ASC
    `;
    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      markers: rows,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
