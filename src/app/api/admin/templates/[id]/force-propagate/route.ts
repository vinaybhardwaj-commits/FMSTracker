/**
 * POST /api/admin/templates/[id]/force-propagate — AD1.2
 *
 * Body: { fields: string[], reason?: string }
 *
 * Overwrites the user-selected snapshot fields on all in-flight (pending,
 * claimed, overdue) task_instances for this template. Audit-logs every
 * propagation with the field list + affected count.
 *
 * Whitelist of propagatable fields enforced server-side: anything not in the
 * whitelist is silently dropped. Cadence/anchor changes never propagate
 * (they apply only to future engine generations).
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const PROPAGATABLE_FIELDS = new Set([
  "task_name",
  "system",
  "location_or_asset",
  "acceptance_criteria",
  "evidence_required",
  "priority_weight",
  "amc_vendor_id",
]);

interface Body {
  fields?: string[];
  reason?: string;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await ctx.params;
  const tid = parseInt(id, 10);
  if (!Number.isFinite(tid)) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }

  const fields = (body.fields ?? []).filter((f) => PROPAGATABLE_FIELDS.has(f));
  if (fields.length === 0) {
    return NextResponse.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  // Pull template values for selected fields
  const { rows: tplRows } = await sql`
    SELECT task_name, system, location_or_asset, acceptance_criteria,
           evidence_required, priority_weight, amc_vendor_id
    FROM task_templates WHERE id = ${tid}
  `;
  if (!tplRows[0]) {
    return NextResponse.json({ ok: false, error: "template_not_found" }, { status: 404 });
  }
  const tpl = tplRows[0] as Record<string, unknown>;

  // Build dynamic SET clause — only the requested fields
  const setSql: string[] = [];
  const args: unknown[] = [];
  function bind(v: unknown) {
    args.push(v);
    return `$${args.length}`;
  }
  for (const f of fields) {
    setSql.push(`${f} = ${bind(tpl[f])}`);
  }
  setSql.push(`updated_at = NOW()`);
  args.push(tid);
  const tidPlaceholder = `$${args.length}`;

  const queryText = `
    UPDATE task_instances
    SET ${setSql.join(", ")}
    WHERE template_id = ${tidPlaceholder}
      AND status IN ('pending', 'claimed', 'overdue')
    RETURNING id
  `;
  const { rows: affected } = await (sql as any).query(queryText, args);

  await writeAudit({
    table: "task_templates",
    recordId: tid,
    action: "force_propagate",
    byName: "admin",
    diff: {
      fields_propagated: fields,
      affected_count: affected.length,
      reason: body.reason ?? null,
      session_id: session.sessionId,
    },
  });

  return NextResponse.json({
    ok: true,
    affected_count: affected.length,
    fields_propagated: fields,
  });
}
