/**
 * src/app/admin/tasks/[id]/page.tsx — S12 Task edit (existing).
 */

import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import type { TaskTemplate, Vendor } from "@/lib/types";
import { TaskEditForm } from "../_edit-form";

export const dynamic = "force-dynamic";

async function loadOne(id: number): Promise<TaskTemplate | null> {
  const { rows } = await sql`
    SELECT id, task_id, system, subsystem, location_or_asset, task_name,
           cadence, frequency_in_days, cadence_anchor, actor_type,
           amc_vendor_id, acceptance_criteria, evidence_required,
           reference_policy, nabh_standard_ref, priority_weight,
           draft_status, notes, active, created_at, updated_at
    FROM task_templates WHERE id = ${id}
  `;
  return (rows[0] as TaskTemplate) ?? null;
}

async function loadVendors(): Promise<Vendor[]> {
  const { rows } = await sql`
    SELECT id, vendor_id, system, vendor_name, contact_name, phone, email,
           visit_cadence, scope_notes, active
    FROM vendors WHERE active = TRUE ORDER BY system, vendor_name
  `;
  return rows as Vendor[];
}

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) notFound();

  const [t, vendors] = await Promise.all([loadOne(numericId), loadVendors()]);
  if (!t) notFound();

  return (
    <main className="px-6 py-6">
      <TaskEditForm initial={t} vendors={vendors} />
    </main>
  );
}
