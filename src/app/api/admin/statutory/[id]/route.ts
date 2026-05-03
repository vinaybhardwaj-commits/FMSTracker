/**
 * src/app/api/admin/statutory/[id]/route.ts — PATCH + DELETE (soft).
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

function nullIfEmpty(v: string | undefined | null): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

interface Body {
  licence_id?: string;
  item: string;
  authority?: string;
  current_expiry?: string;
  source_doc?: string;
  notes?: string;
  active?: boolean;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.item) return NextResponse.json({ error: "item_required" }, { status: 400 });

  try {
    const { rows: priorRows } = await sql`SELECT licence_id, item, current_expiry::text AS current_expiry, active FROM statutory_items WHERE id = ${numericId}`;
    const before = priorRows[0] ?? {};
    await sql`
      UPDATE statutory_items SET
        licence_id = ${nullIfEmpty(body.licence_id)},
        item = ${body.item},
        authority = ${nullIfEmpty(body.authority)},
        current_expiry = ${nullIfEmpty(body.current_expiry)}::date,
        source_doc = ${nullIfEmpty(body.source_doc)},
        notes = ${nullIfEmpty(body.notes)},
        active = ${body.active ?? true}
      WHERE id = ${numericId}
    `;
    await writeAudit({ table: "statutory_items", recordId: numericId, action: "update", byName: "admin", diff: { before, after: body } });
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
    const { rows: priorRows } = await sql`SELECT licence_id, item FROM statutory_items WHERE id = ${numericId}`;
    await sql`UPDATE statutory_items SET active = FALSE WHERE id = ${numericId}`;
    await writeAudit({ table: "statutory_items", recordId: numericId, action: "soft_delete", byName: "admin", diff: { ...(priorRows[0] ?? {}) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
