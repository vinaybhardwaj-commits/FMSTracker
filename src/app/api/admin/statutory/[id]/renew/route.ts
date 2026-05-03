/**
 * src/app/api/admin/statutory/[id]/renew/route.ts — log a renewal.
 *
 * POST { new_expiry: 'YYYY-MM-DD', certificate_url?, notes? }
 * Inserts into statutory_renewals + updates statutory_items.current_expiry +
 * (optionally) current_certificate_url. Audit log.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

interface Body {
  new_expiry?: string;
  certificate_url?: string;
  notes?: string;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.new_expiry || !/^\d{4}-\d{2}-\d{2}$/.test(body.new_expiry)) {
    return NextResponse.json({ error: "new_expiry_invalid" }, { status: 400 });
  }
  // must be > today
  const todayIso = new Date().toISOString().slice(0, 10);
  if (body.new_expiry <= todayIso) {
    return NextResponse.json({ error: "new_expiry_must_be_future" }, { status: 400 });
  }
  const certUrl = (body.certificate_url ?? "").trim();
  const notes = (body.notes ?? "").trim();

  try {
    const { rows: priorRows } = await sql`SELECT current_expiry::text AS current_expiry, item FROM statutory_items WHERE id = ${numericId}`;
    if (!priorRows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const previousExpiry = priorRows[0].current_expiry as string | null;

    await sql`
      INSERT INTO statutory_renewals (statutory_id, previous_expiry, new_expiry, certificate_url, notes)
      VALUES (${numericId}, ${previousExpiry}::date, ${body.new_expiry}::date,
              ${certUrl || null}, ${notes || null})
    `;
    await sql`
      UPDATE statutory_items
      SET current_expiry = ${body.new_expiry}::date,
          current_certificate_url = COALESCE(NULLIF(${certUrl}, ''), current_certificate_url)
      WHERE id = ${numericId}
    `;
    await writeAudit({
      table: "statutory_items",
      recordId: numericId,
      action: "statutory_renew",
      byName: "admin",
      diff: { item: priorRows[0].item, previous_expiry: previousExpiry, new_expiry: body.new_expiry },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
