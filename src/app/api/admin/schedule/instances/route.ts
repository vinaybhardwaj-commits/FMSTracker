/**
 * GET /api/admin/schedule/instances?from=YYYY-MM-DD&to=YYYY-MM-DD&systems=A,B
 *
 * Returns task_instances within [from, to] inclusive, with filters. The
 * Schedule module uses this for Day/Week/Month/Quarter/Year views.
 *
 * AD1.3 lock per build sub-decisions: NO projection of unrendered anchors.
 * Only rows the engine has generated appear. Year view supplements this with
 * /statutory-markers for compliance dates.
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
  const systemsParam = url.searchParams.get("systems") ?? "";
  const cadenceParam = url.searchParams.get("cadence") ?? "";

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ ok: false, error: "bad_range" }, { status: 400 });
  }
  const systems = systemsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const cadences = cadenceParam.split(",").map((s) => s.trim()).filter(Boolean);

  const conds: string[] = ["ti.due_date BETWEEN $1 AND $2"];
  const args: unknown[] = [from, to];
  function bind(v: unknown) {
    args.push(v);
    return `$${args.length}`;
  }
  if (systems.length > 0) {
    conds.push(`ti.system = ANY(${bind(systems)}::text[])`);
  }
  if (cadences.length > 0) {
    conds.push(`tt.cadence = ANY(${bind(cadences)}::text[])`);
  }

  const queryText = `
    SELECT
      ti.id,
      ti.template_id,
      ti.task_name,
      ti.system,
      ti.location_or_asset,
      to_char(ti.due_date, 'YYYY-MM-DD') AS due_date,
      ti.status,
      ti.priority_weight,
      tt.cadence,
      tt.cadence_anchor
    FROM task_instances ti
    LEFT JOIN task_templates tt ON tt.id = ti.template_id
    WHERE ${conds.join(" AND ")}
    ORDER BY ti.due_date ASC, ti.priority_weight DESC, ti.id ASC
    LIMIT 5000
  `;
  try {
    const { rows } = await (sql as any).query(queryText, args);
    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      from,
      to,
      instances: rows,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
