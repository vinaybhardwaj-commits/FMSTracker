/**
 * src/app/api/admin/statutory/route.ts — list + create.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

interface Body {
  licence_id?: string;
  item: string;
  authority?: string;
  current_expiry?: string; // YYYY-MM-DD
  source_doc?: string;
  notes?: string;
  active?: boolean;
}

function nullIfEmpty(v: string | undefined | null): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

async function nextLicenceId(): Promise<string> {
  const { rows } = await sql`SELECT licence_id FROM statutory_items WHERE licence_id LIKE 'S-%' ORDER BY licence_id DESC LIMIT 1`;
  if (!rows[0]?.licence_id) return "S-01";
  const m = /^S-(\d+)$/.exec(rows[0].licence_id);
  if (!m) return "S-01";
  return `S-${String(parseInt(m[1], 10) + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.item) return NextResponse.json({ error: "item_required" }, { status: 400 });

  const licenceId = nullIfEmpty(body.licence_id) ?? (await nextLicenceId());
  try {
    const { rows } = await sql`
      INSERT INTO statutory_items (licence_id, item, authority, current_expiry, source_doc, notes, active)
      VALUES (${licenceId}, ${body.item}, ${nullIfEmpty(body.authority)},
              ${nullIfEmpty(body.current_expiry)}::date,
              ${nullIfEmpty(body.source_doc)}, ${nullIfEmpty(body.notes)}, ${body.active ?? true})
      RETURNING id, licence_id
    `;
    await writeAudit({ table: "statutory_items", recordId: rows[0].id, action: "create", byName: "admin", diff: { licence_id: rows[0].licence_id, item: body.item } });
    return NextResponse.json({ ok: true, id: rows[0].id, licence_id: rows[0].licence_id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
