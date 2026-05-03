// src/app/api/admin/locations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { nullIfEmpty, intOrNull } from "@/lib/admin-entity";

export const runtime = "nodejs";

interface Body {
  asset_id?: string;
  system: string;
  name: string;
  floor?: string;
  sub_location?: string;
  count?: string | number;
  criticality?: string;
  notes?: string;
  active?: boolean;
}

async function nextAssetId(): Promise<string> {
  const { rows } = await sql`SELECT asset_id FROM locations WHERE asset_id LIKE 'L-%' ORDER BY asset_id DESC LIMIT 1`;
  if (!rows[0]?.asset_id) return "L-001";
  const m = /^L-(\d+)$/.exec(rows[0].asset_id);
  if (!m) return "L-001";
  return `L-${String(parseInt(m[1], 10) + 1).padStart(3, "0")}`;
}

function crit(v?: string): string | null {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const l = s.toLowerCase();
  return ["critical", "high", "medium", "low"].includes(l) ? l : null;
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.system || !body.name) return NextResponse.json({ error: "system_and_name_required" }, { status: 400 });

  const assetId = nullIfEmpty(body.asset_id) ?? (await nextAssetId());
  try {
    const { rows } = await sql`
      INSERT INTO locations (asset_id, system, name, floor, sub_location, count, criticality, notes, active)
      VALUES (${assetId}, ${body.system}, ${body.name}, ${nullIfEmpty(body.floor)},
              ${nullIfEmpty(body.sub_location)}, ${intOrNull(body.count)},
              ${crit(body.criticality)}, ${nullIfEmpty(body.notes)}, ${body.active ?? true})
      RETURNING id, asset_id
    `;
    await writeAudit({ table: "locations", recordId: rows[0].id, action: "create", byName: "admin", diff: { asset_id: rows[0].asset_id, name: body.name } });
    return NextResponse.json({ ok: true, id: rows[0].id, asset_id: rows[0].asset_id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
