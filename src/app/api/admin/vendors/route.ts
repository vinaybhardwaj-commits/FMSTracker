// src/app/api/admin/vendors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { nullIfEmpty } from "@/lib/admin-entity";

export const runtime = "nodejs";

interface Body {
  vendor_id?: string;
  system: string;
  vendor_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  visit_cadence?: string;
  scope_notes?: string;
  active?: boolean;
}

async function nextVendorId(): Promise<string> {
  const { rows } = await sql`SELECT vendor_id FROM vendors WHERE vendor_id LIKE 'V-%' ORDER BY vendor_id DESC LIMIT 1`;
  if (!rows[0]?.vendor_id) return "V-01";
  const m = /^V-(\d+)$/.exec(rows[0].vendor_id);
  if (!m) return "V-01";
  return `V-${String(parseInt(m[1], 10) + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.system || !body.vendor_name) return NextResponse.json({ error: "system_and_name_required" }, { status: 400 });

  const vendorId = nullIfEmpty(body.vendor_id) ?? (await nextVendorId());
  try {
    const { rows } = await sql`
      INSERT INTO vendors (vendor_id, system, vendor_name, contact_name, phone, email, visit_cadence, scope_notes, active)
      VALUES (${vendorId}, ${body.system}, ${body.vendor_name},
              ${nullIfEmpty(body.contact_name)}, ${nullIfEmpty(body.phone)},
              ${nullIfEmpty(body.email)}, ${nullIfEmpty(body.visit_cadence)},
              ${nullIfEmpty(body.scope_notes)}, ${body.active ?? true})
      RETURNING id, vendor_id
    `;
    await writeAudit({ table: "vendors", recordId: rows[0].id, action: "create", byName: "admin", diff: { vendor_id: rows[0].vendor_id, vendor_name: body.vendor_name } });
    return NextResponse.json({ ok: true, id: rows[0].id, vendor_id: rows[0].vendor_id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
