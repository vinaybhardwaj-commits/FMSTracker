/**
 * src/app/api/today/route.ts — Worker home payload.
 *
 * Returns:
 *  - instances for today + any pre-today overdue (status='overdue')
 *  - urgent statutory items (red + critical) for the pinned banner
 *  - claimer name (joined from devices) for instances claimed by someone
 */

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { todayInIST } from "@/lib/engine";
import { tierForExpiry, isUrgent } from "@/lib/statutory";
import { fetchRingsData } from "@/components/ProgressRings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InstanceRow {
  id: number;
  template_id: number | null;
  due_date: string;
  task_name: string;
  system: string;
  location_or_asset: string | null;
  acceptance_criteria: string;
  evidence_required: string;
  priority_weight: number;
  status: string;
  cadence: string | null;
  claimed_by_device: string | null;
  claimed_by_name: string | null;
  claim_expires_at: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
}

export async function GET() {
  const today = todayInIST();

  const { rows: instances } = await sql<InstanceRow>`
    SELECT
      i.id, i.template_id, i.due_date::text AS due_date,
      i.task_name, i.system, i.location_or_asset,
      i.acceptance_criteria, i.evidence_required, i.priority_weight,
      i.status, t.cadence,
      i.claimed_by_device::text AS claimed_by_device,
      d.device_uuid AS claimed_by_device_uuid,
      d.name AS claimed_by_name,
      i.claim_expires_at::text AS claim_expires_at,
      i.completed_by_name, i.completed_at::text AS completed_at
    FROM task_instances i
    LEFT JOIN task_templates t ON t.id = i.template_id
    LEFT JOIN devices d ON d.id = i.claimed_by_device
    WHERE i.due_date = ${today}::date
         OR (i.status = 'overdue' AND i.due_date = (${today}::date - INTERVAL '1 day'))
    ORDER BY i.priority_weight DESC, i.system, i.task_name
  `;

  const { rows: stat } = await sql<{ id: number; licence_id: string | null; item: string; current_expiry: string | null }>`
    SELECT id, licence_id, item, current_expiry::text AS current_expiry
    FROM statutory_items WHERE active = TRUE
  `;
  const tiered = stat.map((s) => ({ ...s, ...tierForExpiry(s.current_expiry) }));
  const urgent = tiered.filter((s) => isUrgent(s.tier));
  // Yellow + orange surface in today list as cards (PRD §3.3)
  const upcoming_statutory = tiered.filter((s) => s.tier === "yellow" || s.tier === "orange");

  const rings = await fetchRingsData();

  return NextResponse.json({
    today,
    instances,
    urgent_statutory: urgent,
    upcoming_statutory,
    rings,
  });
}
