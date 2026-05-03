/**
 * src/app/api/admin/templates/[id]/route.ts
 *
 * PATCH  → update a template (full replace of editable fields).
 * DELETE → soft-delete (active=FALSE; no new instances generated).
 *
 * Phase 4 will add: audit_log writes, force-propagate handling.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

function nullIfEmpty(v: string | undefined | null): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

interface Body {
  task_id?: string;
  system: string;
  subsystem?: string;
  location_or_asset?: string;
  task_name: string;
  cadence: string;
  frequency_in_days: number;
  cadence_anchor?: string;
  actor_type: string;
  amc_vendor_id?: number | null;
  acceptance_criteria: string;
  evidence_required: string;
  reference_policy?: string;
  nabh_standard_ref?: string;
  priority_weight?: number;
  draft_status?: string;
  notes?: string;
  active?: boolean;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.task_name || !body.system || !body.acceptance_criteria) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  try {
    // Capture before-state for audit diff
    const { rows: priorRows } = await sql`SELECT task_id, task_name, system, cadence, active FROM task_templates WHERE id = ${numericId}`;
    const before = priorRows[0] ?? {};
    await sql`
      UPDATE task_templates SET
        task_id = ${nullIfEmpty(body.task_id)},
        system = ${body.system},
        subsystem = ${nullIfEmpty(body.subsystem)},
        location_or_asset = ${nullIfEmpty(body.location_or_asset)},
        task_name = ${body.task_name},
        cadence = ${body.cadence},
        frequency_in_days = ${body.frequency_in_days},
        cadence_anchor = ${nullIfEmpty(body.cadence_anchor)},
        actor_type = ${body.actor_type},
        amc_vendor_id = ${body.amc_vendor_id ?? null},
        acceptance_criteria = ${body.acceptance_criteria},
        evidence_required = ${body.evidence_required},
        reference_policy = ${nullIfEmpty(body.reference_policy)},
        nabh_standard_ref = ${nullIfEmpty(body.nabh_standard_ref)},
        priority_weight = ${body.priority_weight ?? 50},
        draft_status = ${body.draft_status ?? "proposed"},
        notes = ${nullIfEmpty(body.notes)},
        active = ${body.active ?? true}
      WHERE id = ${numericId}
    `;
    const after = { task_id: body.task_id, task_name: body.task_name, system: body.system, cadence: body.cadence, active: body.active };
    await writeAudit({
      table: "task_templates",
      recordId: numericId,
      action: "update",
      byName: "admin",
      diff: { before, after },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  try {
    const { rows: priorRows } = await sql`SELECT task_id, task_name FROM task_templates WHERE id = ${numericId}`;
    await sql`UPDATE task_templates SET active = FALSE WHERE id = ${numericId}`;
    await writeAudit({
      table: "task_templates",
      recordId: numericId,
      action: "soft_delete",
      byName: "admin",
      diff: { ...(priorRows[0] ?? {}) },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
