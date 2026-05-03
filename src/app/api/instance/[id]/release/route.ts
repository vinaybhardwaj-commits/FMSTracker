/**
 * src/app/api/instance/[id]/release/route.ts — POST { device_uuid, reason } → release any claim.
 *
 * Any device can release any claim. Reason is required (free-text).
 * Phase 4 will write to audit_log (action='claim_released'). Stub here.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { resolveDevice } from "@/lib/device-server";

export const runtime = "nodejs";

interface Body { device_uuid?: string; reason?: string }

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
  if (!reason) return NextResponse.json({ error: "reason_required" }, { status: 400 });

  const { rows } = await sql`
    UPDATE task_instances
    SET status = 'pending',
        claimed_by_device = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL,
        notes = COALESCE(notes, '') ||
                CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE E'\n' END ||
                'Claim released by ' || ${dev.name} || ': ' || ${reason}
    WHERE id = ${numericId} AND status = 'claimed'
    RETURNING id, status
  `;

  if (!rows[0]) {
    return NextResponse.json({ error: "not_claimed_or_not_found" }, { status: 404 });
  }
  // TODO Phase 4: insert into audit_log (action='claim_released')
  return NextResponse.json({ ok: true, ...rows[0] });
}
