/**
 * src/app/api/instance/[id]/route.ts — Single instance detail for S03.
 */

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { rows } = await sql`
    SELECT
      i.id, i.template_id, i.due_date::text AS due_date,
      i.task_name, i.system, i.location_or_asset,
      i.acceptance_criteria, i.evidence_required, i.priority_weight,
      i.status, t.cadence, t.subsystem,
      t.reference_policy, t.nabh_standard_ref,
      i.claimed_by_device::text AS claimed_by_device,
      d.name AS claimed_by_name,
      d.baseline_selfie_url AS claimed_by_avatar,
      i.claim_expires_at::text AS claim_expires_at,
      i.completed_by_name, i.completed_at::text AS completed_at,
      i.selfie_url, i.photo_urls, i.reading_value,
      i.vendor_report_url, i.vendor_present_photo_url,
      i.vendor_next_due_date::text AS vendor_next_due_date,
      i.skip_reason,
      v.id AS vendor_id, v.vendor_name, v.contact_name AS vendor_contact,
      v.phone AS vendor_phone, v.visit_cadence AS vendor_cadence
    FROM task_instances i
    LEFT JOIN task_templates t ON t.id = i.template_id
    LEFT JOIN devices d ON d.id = i.claimed_by_device
    LEFT JOIN vendors v ON v.id = i.amc_vendor_id
    WHERE i.id = ${numericId}
  `;

  if (!rows[0]) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ instance: rows[0] });
}
