/**
 * src/app/api/instance/[id]/claim/route.ts — POST { device_uuid } → claim a task.
 *
 * - 30-min soft claim (claim_expires_at = NOW() + 30 min)
 * - 409 if another non-expired claim exists (caller should refresh + try release)
 * - 200 + new state on success
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { resolveDevice } from "@/lib/device-server";

export const runtime = "nodejs";

interface Body { device_uuid?: string }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const dev = await resolveDevice(body.device_uuid);
  if (!dev) return NextResponse.json({ error: "unknown_device" }, { status: 401 });

  // First clear any expired claim on this row
  await sql`
    UPDATE task_instances
    SET status = 'pending', claimed_by_device = NULL, claimed_at = NULL, claim_expires_at = NULL
    WHERE id = ${numericId} AND status = 'claimed' AND claim_expires_at < NOW()
  `;

  // Then try to claim if free
  const { rows } = await sql`
    UPDATE task_instances
    SET status = 'claimed',
        claimed_by_device = ${dev.id}::uuid,
        claimed_at = NOW(),
        claim_expires_at = NOW() + INTERVAL '30 minutes'
    WHERE id = ${numericId}
      AND status IN ('pending', 'overdue')
    RETURNING id, status, claimed_at::text AS claimed_at, claim_expires_at::text AS claim_expires_at
  `;

  if (!rows[0]) {
    // Either not found or already claimed — distinguish
    const { rows: state } = await sql`
      SELECT status, d.name AS claimed_by_name, claim_expires_at::text AS claim_expires_at
      FROM task_instances LEFT JOIN devices d ON d.id = task_instances.claimed_by_device
      WHERE task_instances.id = ${numericId}
    `;
    if (!state[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(
      { error: "already_claimed", state: state[0] },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, ...rows[0] });
}
