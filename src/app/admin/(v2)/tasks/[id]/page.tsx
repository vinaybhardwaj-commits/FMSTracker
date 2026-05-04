/**
 * src/app/admin/(v2)/tasks/[id]/page.tsx — AD1.2
 *
 * Edit form on the left, in-flight impact panel on the right.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { TaskForm, type TaskFormValues } from "@/components/admin/tasks/TaskForm";
import { InFlightImpactPanel } from "@/components/admin/tasks/InFlightImpactPanel";

export const dynamic = "force-dynamic";

async function loadTemplate(tid: number): Promise<TaskFormValues | null> {
  const { rows } = await sql`
    SELECT id, task_id, system, subsystem, location_or_asset, task_name,
           cadence, frequency_in_days, cadence_anchor, actor_type,
           amc_vendor_id, acceptance_criteria, evidence_required,
           reference_policy, nabh_standard_ref, priority_weight,
           draft_status, notes, active
    FROM task_templates WHERE id = ${tid}
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    task_id: r.task_id ?? "",
    system: r.system ?? "",
    subsystem: r.subsystem ?? "",
    location_or_asset: r.location_or_asset ?? "",
    task_name: r.task_name ?? "",
    cadence: r.cadence ?? "daily",
    frequency_in_days: r.frequency_in_days ?? 1,
    cadence_anchor: r.cadence_anchor ?? "",
    actor_type: r.actor_type ?? "in_house",
    amc_vendor_id: r.amc_vendor_id ?? null,
    acceptance_criteria: r.acceptance_criteria ?? "",
    evidence_required: r.evidence_required ?? "selfie+photo",
    reference_policy: r.reference_policy ?? "",
    nabh_standard_ref: r.nabh_standard_ref ?? "",
    priority_weight: r.priority_weight ?? 50,
    draft_status: r.draft_status ?? "proposed",
    notes: r.notes ?? "",
    active: r.active ?? true,
  };
}

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  const { id } = await params;
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent(`/admin/tasks/${id}`));

  const tid = parseInt(id, 10);
  if (!Number.isFinite(tid)) notFound();

  const initial = await loadTemplate(tid);
  if (!initial) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href={"/admin/tasks" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">
          ← Tasks
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">
          {initial.task_id || `Template #${tid}`} · {initial.task_name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Edit any field. To push changes onto in-flight task instances, use the panel on the right after saving.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <TaskForm templateId={tid} initial={initial} />
        </div>
        <div>
          <InFlightImpactPanel
            templateId={tid}
            templateSnapshot={initial as unknown as Record<string, unknown>}
          />
        </div>
      </div>
    </div>
  );
}
