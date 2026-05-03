/**
 * src/app/api/instance/[id]/complete/route.ts — submit completion.
 *
 * POST { device_uuid, selfie_url, photo_urls?, reading_value?,
 *        vendor_present_photo_url?, vendor_report_url?,
 *        vendor_next_due_date?, notes? }
 *
 * Marks instance status='done', stores all evidence URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { resolveDevice } from "@/lib/device-server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  device_uuid?: string;
  selfie_url?: string;
  photo_urls?: string[];
  reading_value?: string;
  vendor_present_photo_url?: string;
  vendor_report_url?: string;
  vendor_next_due_date?: string;
  notes?: string;
}

function isHttps(u: string | undefined): u is string {
  return typeof u === "string" && u.startsWith("https://");
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const dev = await resolveDevice(body.device_uuid);
  if (!dev) return NextResponse.json({ error: "unknown_device" }, { status: 401 });

  if (!isHttps(body.selfie_url)) {
    return NextResponse.json({ error: "selfie_url_required" }, { status: 400 });
  }

  // Look up evidence_required to validate the right fields are present
  const { rows: instanceRows } = await sql`
    SELECT evidence_required, status FROM task_instances WHERE id = ${numericId}
  `;
  if (!instanceRows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { evidence_required, status } = instanceRows[0] as { evidence_required: string; status: string };
  if (!["pending", "claimed", "overdue"].includes(status)) {
    return NextResponse.json({ error: "not_completable", current_status: status }, { status: 409 });
  }

  // Validate evidence presence
  const photos = (body.photo_urls ?? []).filter(isHttps);
  if (evidence_required === "selfie+photo" || evidence_required === "selfie+photo+reading") {
    if (photos.length === 0) {
      return NextResponse.json({ error: "photos_required" }, { status: 400 });
    }
  }
  if (evidence_required === "selfie+photo+reading") {
    if (!body.reading_value || !body.reading_value.trim()) {
      return NextResponse.json({ error: "reading_required" }, { status: 400 });
    }
  }
  if (evidence_required === "selfie+vendor_report+next_due_date") {
    if (!isHttps(body.vendor_present_photo_url) || !isHttps(body.vendor_report_url)) {
      return NextResponse.json({ error: "vendor_proofs_required" }, { status: 400 });
    }
    if (!body.vendor_next_due_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.vendor_next_due_date)) {
      return NextResponse.json({ error: "vendor_due_date_required" }, { status: 400 });
    }
  }

  // photo_urls is TEXT[] in Postgres. @vercel/postgres' tagged sql can't
  // bind a JS array in a single ${} slot, so use sql.query with $-params.
  try {
    await (sql as any).query(
      `UPDATE task_instances
       SET status = 'done',
           completed_by_device = $1::uuid,
           completed_by_name = $2,
           completed_at = NOW(),
           selfie_url = $3,
           photo_urls = $4::text[],
           reading_value = $5,
           vendor_present_photo_url = $6,
           vendor_report_url = $7,
           vendor_next_due_date = $8::date,
           notes = COALESCE(NULLIF($9, ''), notes),
           claim_expires_at = NULL
       WHERE id = $10`,
      [
        dev.id,
        dev.name,
        body.selfie_url,
        photos.length > 0 ? photos : null,
        body.reading_value ?? null,
        body.vendor_present_photo_url ?? null,
        body.vendor_report_url ?? null,
        body.vendor_next_due_date ?? null,
        body.notes ?? "",
        numericId,
      ]
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
