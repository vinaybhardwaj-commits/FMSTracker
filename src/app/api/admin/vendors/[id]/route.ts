// src/app/api/admin/vendors/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { nullIfEmpty } from "@/lib/admin-entity";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as any;
  if (!body.system || !body.vendor_name) return NextResponse.json({ error: "system_and_name_required" }, { status: 400 });
  try {
    const { rows: priorRows } = await sql`SELECT vendor_id, vendor_name, system, active FROM vendors WHERE id = ${numericId}`;
    await sql`
      UPDATE vendors SET
        vendor_id = ${nullIfEmpty(body.vendor_id)},
        system = ${body.system}, vendor_name = ${body.vendor_name},
        contact_name = ${nullIfEmpty(body.contact_name)}, phone = ${nullIfEmpty(body.phone)},
        email = ${nullIfEmpty(body.email)}, visit_cadence = ${nullIfEmpty(body.visit_cadence)},
        scope_notes = ${nullIfEmpty(body.scope_notes)}, active = ${body.active ?? true}
      WHERE id = ${numericId}
    `;
    await writeAudit({ table: "vendors", recordId: numericId, action: "update", byName: "admin", diff: { before: priorRows[0] ?? {}, after: body } });
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
    const { rows: priorRows } = await sql`SELECT vendor_id, vendor_name FROM vendors WHERE id = ${numericId}`;
    await sql`UPDATE vendors SET active = FALSE WHERE id = ${numericId}`;
    await writeAudit({ table: "vendors", recordId: numericId, action: "soft_delete", byName: "admin", diff: { ...(priorRows[0] ?? {}) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
