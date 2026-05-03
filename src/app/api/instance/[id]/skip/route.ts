/**
 * src/app/api/instance/[id]/skip/route.ts — POST { device_uuid, reason, notes? }.
 *
 * Reason taxonomy (M1): not_enough_staff, area_in_use, supplies_unavailable, other.
 * "other" requires non-empty notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { resolveDevice } from "@/lib/device-server";

export const runtime = "nodejs";

const VALID_REASONS = new Set(["not_enough_staff", "area_in_use", "supplies_unavailable", "other"]);

interface Body { device_uuid?: string; reason?: string; notes?: string }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const dev = await resolveDevice(body.device_uuid);
  if (!dev) return NextResponse.json({ error: "unknown_device" }, { status: 401 });

  const reason = (body.reason ?? "").trim();
  const notes = (body.notes ?? "").trim();
  if (!VALID_REASONS.has(reason)) return NextResponse.json({ error: "invalid_reason" }, { status: 400 });
  if (reason === "other" && !notes) {
    return NextResponse.json({ error: "notes_required_for_other" }, { status: 400 });
  }

  const { rows } = await sql`
    UPDATE task_instances
    SET status = 'skipped',
        skip_reason = ${reason},
        notes = COALESCE(NULLIF(${notes}, ''), notes),
        completed_by_device = ${dev.id}::uuid,
        completed_by_name = ${dev.name},
        completed_at = NOW(),
        claimed_by_device = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL
    WHERE id = ${numericId} AND status IN ('pending', 'claimed', 'overdue')
    RETURNING id, status
  `;
  if (!rows[0]) return NextResponse.json({ error: "not_skippable_or_not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...rows[0] });
}
