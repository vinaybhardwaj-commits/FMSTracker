/**
 * POST /api/admin/templates/bulk — AD1.2
 *
 * Body: { ids: number[], action: 'activate' | 'deactivate' }
 *
 * Single audit row per call summarizing the bulk operation.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

interface Body {
  ids?: number[];
  action?: "activate" | "deactivate";
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }
  const ids = (body.ids ?? []).filter((n) => Number.isFinite(n));
  const action = body.action;
  if (ids.length === 0 || !action || !["activate", "deactivate"].includes(action)) {
    return NextResponse.json({ ok: false, error: "bad_params" }, { status: 400 });
  }
  if (ids.length > 200) {
    return NextResponse.json({ ok: false, error: "too_many" }, { status: 400 });
  }

  const newActive = action === "activate";
  const queryText = `
    UPDATE task_templates
    SET active = $1, updated_at = NOW()
    WHERE id = ANY($2::int[])
    RETURNING id
  `;
  const { rows: affected } = await (sql as any).query(queryText, [newActive, ids]);

  await writeAudit({
    table: "task_templates",
    recordId: `bulk:${ids.length}`,
    action: action === "activate" ? "update" : "soft_delete",
    byName: "admin",
    diff: {
      kind: "bulk_" + action,
      ids,
      affected_count: affected.length,
      session_id: session.sessionId,
    },
  });

  return NextResponse.json({ ok: true, affected_count: affected.length, action });
}
