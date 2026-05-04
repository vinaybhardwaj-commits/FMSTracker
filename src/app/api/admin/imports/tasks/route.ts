/**
 * POST /api/admin/imports/tasks — AD1.7 / Phase 5
 *
 * Body: multipart/form-data with field 'csv' OR JSON { rows: TaskCsvRow[] }
 * For v1.0 we accept JSON only (parsed client-side from CSV) — keeps the
 * server thin. Returns { ok, preview: ..., applied: ..., errors: [] }.
 *
 * Mode flag: action = 'preview' | 'commit'. Preview validates without writing.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TaskCsvRow {
  task_id?: string;
  system: string;
  task_name: string;
  cadence: string;
  frequency_in_days: number | string;
  cadence_anchor?: string;
  actor_type: string;
  acceptance_criteria: string;
  evidence_required: string;
  priority_weight?: number | string;
  active?: boolean | string;
  notes?: string;
}

const VALID_CADENCES = new Set(["daily", "weekly", "monthly", "quarterly", "semi_annual", "annual", "statutory_renewal"]);
const VALID_ACTORS = new Set(["in_house", "amc_supervised", "statutory"]);
const VALID_EVIDENCE = new Set(["selfie+photo", "selfie+photo+reading", "selfie+vendor_report+next_due_date"]);

function validate(row: TaskCsvRow, idx: number): { ok: true; cleaned: TaskCsvRow } | { ok: false; error: string } {
  if (!row.system?.trim()) return { ok: false, error: `Row ${idx + 1}: system required` };
  if (!row.task_name?.trim()) return { ok: false, error: `Row ${idx + 1}: task_name required` };
  if (!row.cadence || !VALID_CADENCES.has(row.cadence)) return { ok: false, error: `Row ${idx + 1}: cadence invalid (${row.cadence})` };
  if (!row.actor_type || !VALID_ACTORS.has(row.actor_type)) return { ok: false, error: `Row ${idx + 1}: actor_type invalid` };
  if (!row.acceptance_criteria?.trim()) return { ok: false, error: `Row ${idx + 1}: acceptance_criteria required` };
  if (!row.evidence_required || !VALID_EVIDENCE.has(row.evidence_required)) return { ok: false, error: `Row ${idx + 1}: evidence_required invalid` };
  const freq = typeof row.frequency_in_days === "string" ? parseInt(row.frequency_in_days, 10) : row.frequency_in_days;
  if (!Number.isFinite(freq) || freq < 1) return { ok: false, error: `Row ${idx + 1}: frequency_in_days must be a positive integer` };
  return {
    ok: true,
    cleaned: {
      ...row,
      frequency_in_days: freq,
      priority_weight: row.priority_weight ? (typeof row.priority_weight === "string" ? parseInt(row.priority_weight, 10) : row.priority_weight) : 50,
      active: typeof row.active === "string" ? !["false", "0", "no", ""].includes(row.active.toLowerCase()) : (row.active ?? true),
    },
  };
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  let body: { action?: "preview" | "commit"; rows?: TaskCsvRow[] };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 }); }
  const action = body.action ?? "preview";
  const rows = body.rows ?? [];

  if (rows.length === 0) return NextResponse.json({ ok: false, error: "no_rows" }, { status: 400 });
  if (rows.length > 1000) return NextResponse.json({ ok: false, error: "too_many_rows" }, { status: 400 });

  const errors: string[] = [];
  const cleaned: TaskCsvRow[] = [];
  rows.forEach((r, i) => {
    const v = validate(r, i);
    if (v.ok) cleaned.push(v.cleaned); else errors.push(v.error);
  });

  if (action === "preview" || errors.length > 0) {
    return NextResponse.json({
      ok: errors.length === 0,
      mode: "preview",
      total: rows.length,
      valid: cleaned.length,
      errors,
      preview: cleaned.slice(0, 5),
    });
  }

  // Commit
  let inserted = 0;
  let updated = 0;
  for (const r of cleaned) {
    if (r.task_id?.trim()) {
      // upsert via task_id
      const { rows: existing } = await sql`SELECT id FROM task_templates WHERE task_id = ${r.task_id}`;
      if (existing[0]) {
        await sql`
          UPDATE task_templates SET
            system = ${r.system}, task_name = ${r.task_name}, cadence = ${r.cadence},
            frequency_in_days = ${r.frequency_in_days}, cadence_anchor = ${r.cadence_anchor ?? null},
            actor_type = ${r.actor_type}, acceptance_criteria = ${r.acceptance_criteria},
            evidence_required = ${r.evidence_required}, priority_weight = ${r.priority_weight ?? 50},
            active = ${r.active ?? true}, notes = ${r.notes ?? null}, updated_at = NOW()
          WHERE id = ${existing[0].id}
        `;
        updated += 1;
        continue;
      }
    }
    await sql`
      INSERT INTO task_templates (task_id, system, task_name, cadence, frequency_in_days, cadence_anchor, actor_type, acceptance_criteria, evidence_required, priority_weight, active, notes)
      VALUES (${r.task_id ?? null}, ${r.system}, ${r.task_name}, ${r.cadence}, ${r.frequency_in_days}, ${r.cadence_anchor ?? null}, ${r.actor_type}, ${r.acceptance_criteria}, ${r.evidence_required}, ${r.priority_weight ?? 50}, ${r.active ?? true}, ${r.notes ?? null})
    `;
    inserted += 1;
  }

  await writeAudit({
    table: "task_templates",
    recordId: `bulk_import:${cleaned.length}`,
    action: "create",
    byName: "admin",
    diff: { kind: "csv_import", inserted, updated, total: cleaned.length, session_id: session.sessionId },
  });

  return NextResponse.json({ ok: true, mode: "commit", inserted, updated });
}
