/**
 * src/app/admin/(v2)/tasks/page.tsx — AD1.2
 *
 * Tasks list (list + edit + new). Replaces the legacy mobile /admin/tasks.
 * Server component: pulls all templates with their in-flight counts.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { TasksTable, type TaskRow } from "@/components/admin/tasks/TasksTable";

export const dynamic = "force-dynamic";

async function loadTasks(): Promise<{ rows: TaskRow[]; error: string | null }> {
  try {
    const { rows } = await sql`
      SELECT
        t.id,
        t.task_id,
        t.system,
        t.task_name,
        t.cadence,
        t.cadence_anchor,
        t.active,
        t.draft_status,
        t.priority_weight,
        t.updated_at,
        COALESCE(SUM(CASE WHEN ti.status IN ('pending','claimed','overdue') THEN 1 ELSE 0 END), 0)::int AS in_flight_count
      FROM task_templates t
      LEFT JOIN task_instances ti ON ti.template_id = t.id
      GROUP BY t.id
      ORDER BY t.priority_weight DESC, t.system, t.task_id
    `;
    return { rows: rows as TaskRow[], error: null };
  } catch (e) {
    return { rows: [], error: (e as Error).message };
  }
}

export default async function TasksListPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/tasks"));

  const { rows, error } = await loadTasks();

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ehrc-navy">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} template{rows.length === 1 ? "" : "s"} · sortable, filterable, bulk-editable
          </p>
        </div>
        <Link
          href={"/admin/tasks/new" as any}
          className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90"
        >
          + New template
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Database is not reachable: {error}
        </div>
      )}

      <TasksTable rows={rows} />
    </div>
  );
}
