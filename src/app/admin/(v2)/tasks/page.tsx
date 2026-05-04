/**
 * src/app/admin/(v2)/tasks/page.tsx — AD1.2 + AD1.3 (date filter)
 *
 * Tasks list. Server component: pulls all templates with in-flight counts.
 * AD1.3 added optional ?date=YYYY-MM-DD which filters down to templates that
 * have a task_instance on that date — lets Schedule click-throughs land on a
 * filtered Tasks view.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { TasksTable, type TaskRow } from "@/components/admin/tasks/TasksTable";

export const dynamic = "force-dynamic";

interface SP {
  date?: string;
  [k: string]: string | undefined;
}

async function loadTasks(date: string | null): Promise<{ rows: TaskRow[]; error: string | null }> {
  try {
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
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
        INNER JOIN task_instances ti_filter ON ti_filter.template_id = t.id AND ti_filter.due_date = ${date}::date
        LEFT JOIN task_instances ti ON ti.template_id = t.id
        GROUP BY t.id
        ORDER BY t.priority_weight DESC, t.system, t.task_id
      `;
      return { rows: rows as TaskRow[], error: null };
    }
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

export default async function TasksListPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/tasks"));

  const sp = await searchParams;
  const dateFilter = sp.date ?? null;

  const { rows, error } = await loadTasks(dateFilter);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ehrc-navy">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">
            {dateFilter ? (
              <>
                {rows.length} template{rows.length === 1 ? "" : "s"} with instances on{" "}
                <span className="font-medium text-ehrc-navy">
                  {new Date(dateFilter).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </span>{" "}
                · <Link href={"/admin/tasks" as any} className="text-ehrc-blue hover:underline">Clear</Link>
              </>
            ) : (
              <>
                {rows.length} template{rows.length === 1 ? "" : "s"} · sortable, filterable, bulk-editable
              </>
            )}
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
