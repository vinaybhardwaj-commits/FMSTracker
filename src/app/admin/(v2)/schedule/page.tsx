/**
 * src/app/admin/(v2)/schedule/page.tsx — AD1.3
 *
 * Read-only timeline of task instances across day/week/month/quarter/year.
 * View + anchor + filter state held in URL params via <ScheduleClient>.
 */

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { ScheduleClient } from "@/components/admin/schedule/ScheduleClient";

export const dynamic = "force-dynamic";

async function loadAvailableSystems(): Promise<string[]> {
  try {
    const { rows } = await sql`SELECT DISTINCT system FROM task_templates WHERE active = TRUE ORDER BY system`;
    return rows.map((r) => r.system as string);
  } catch {
    return [];
  }
}

export default async function SchedulePage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/schedule"));

  const systems = await loadAvailableSystems();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">Schedule</h1>
        <p className="mt-1 text-sm text-slate-500">
          When does each task fire — across day, week, month, quarter, year. Read-only;
          edits live in <a href="/admin/tasks" className="text-ehrc-blue hover:underline">Tasks</a>.
        </p>
      </div>
      <ScheduleClient availableSystems={systems} />
    </div>
  );
}
