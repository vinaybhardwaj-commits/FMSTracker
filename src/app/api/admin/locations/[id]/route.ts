// src/app/api/admin/locations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { nullIfEmpty, intOrNull } from "@/lib/admin-entity";

export const runtime = "nodejs";

function crit(v?: string): string | null {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const l = s.toLowerCase();
  return ["critical", "high", "medium", "low"].includes(l) ? l : null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as any;
  if (!body.system || !body.name) return NextResponse.json({ error: "system_and_name_required" }, { status: 400 });

  try {
    const { rows: priorRows } = await sql`SELECT asset_id, name, system, active FROM locations WHERE id = ${numericId}`;
    await sql`
      UPDATE locations SET
        asset_id = ${nullIfEmpty(body.asset_id)},
        system = ${body.system}, name = ${body.name},
        floor = ${nullIfEmpty(body.floor)}, sub_location = ${nullIfEmpty(body.sub_location)},
        count = ${intOrNull(body.count)}, criticality = ${crit(body.criticality)},
        notes = ${nullIfEmpty(body.notes)}, active = ${body.active ?? true}
      WHERE id = ${numericId}
    `;
    await writeAudit({ table: "locations", recordId: numericId, action: "update", byName: "admin", diff: { before: priorRows[0] ?? {}, after: body } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  try {
    const { rows: priorRows } = await sql`SELECT asset_id, name FROM locations WHERE id = ${numericId}`;
    await sql`UPDATE locations SET active = FALSE WHERE id = ${numericId}`;
    await writeAudit({ table: "locations", recordId: numericId, action: "soft_delete", byName: "admin", diff: { ...(priorRows[0] ?? {}) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
