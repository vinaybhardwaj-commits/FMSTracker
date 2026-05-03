/**
 * src/app/admin/tasks/page.tsx — S11 Task templates list.
 *
 * Server component renders filtered list. Client island handles the
 * filter form + active-toggle row interactions.
 */

import Link from "next/link";
import { sql } from "@/lib/db";
import { CADENCES, ACTOR_TYPES, DRAFT_STATUSES } from "@/lib/types";
import type { TaskTemplate } from "@/lib/types";
import { TasksFilterBar } from "./_filter-bar";

export const dynamic = "force-dynamic";

interface SP {
  q?: string;
  system?: string;
  cadence?: string;
  actor_type?: string;
  draft_status?: string;
  active?: string;
  [key: string]: string | undefined;
}

async function loadTasks(sp: SP): Promise<{
  rows: TaskTemplate[];
  systems: string[];
}> {
  const conds: string[] = [];
  const args: unknown[] = [];
  function bind(v: unknown) {
    args.push(v);
    return `$${args.length}`;
  }
  if (sp.q && sp.q.trim()) {
    const like = `%${sp.q.trim().toLowerCase()}%`;
    conds.push(
      `(LOWER(task_id) LIKE ${bind(like)} OR LOWER(task_name) LIKE ${bind(like)} OR LOWER(system) LIKE ${bind(like)})`
    );
  }
  if (sp.system) conds.push(`system = ${bind(sp.system)}`);
  if (sp.cadence) conds.push(`cadence = ${bind(sp.cadence)}`);
  if (sp.actor_type) conds.push(`actor_type = ${bind(sp.actor_type)}`);
  if (sp.draft_status) conds.push(`draft_status = ${bind(sp.draft_status)}`);
  if (sp.active === "active") conds.push(`active = TRUE`);
  if (sp.active === "inactive") conds.push(`active = FALSE`);

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const queryText = `
    SELECT id, task_id, system, subsystem, location_or_asset, task_name,
           cadence, frequency_in_days, cadence_anchor, actor_type,
           amc_vendor_id, acceptance_criteria, evidence_required,
           reference_policy, nabh_standard_ref, priority_weight,
           draft_status, notes, active, created_at, updated_at
    FROM task_templates
    ${where}
    ORDER BY priority_weight DESC, system, task_id
    LIMIT 500
  `;

  // Use sql.query escape hatch for dynamic WHERE composition
  const { rows } = await (sql as any).query(queryText, args);

  const sys = await sql`SELECT DISTINCT system FROM task_templates ORDER BY system`;
  return {
    rows: rows as TaskTemplate[],
    systems: sys.rows.map((r) => r.system as string),
  };
}

export default async function AdminTasksPage(props: {
  searchParams: Promise<SP>;
}) {
  const sp = await props.searchParams;
  let data: { rows: TaskTemplate[]; systems: string[] };
  let dbError: string | null = null;
  try {
    data = await loadTasks(sp);
  } catch (e) {
    dbError = (e as Error).message;
    data = { rows: [], systems: [] };
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-sm text-slate-500 hover:text-ehrc-navy"
          >
            ← Admin
          </Link>
          <div className="text-2xl font-bold text-ehrc-navy">
            Task templates
          </div>
          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {data.rows.length}
          </div>
        </div>
        <Link
          href="/admin/tasks/new"
          className="rounded-lg bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New task
        </Link>
      </div>

      <TasksFilterBar
        initial={sp}
        systems={data.systems}
        cadences={CADENCES}
        actorTypes={ACTOR_TYPES}
        draftStatuses={DRAFT_STATUSES}
      />

      {dbError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Database error: {dbError}
          <div className="mt-1 text-xs text-red-600">
            If this is the first run, the schema may not be migrated yet. Run{" "}
            <code className="font-mono">pnpm migrate &amp;&amp; pnpm seed</code>.
          </div>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">System</th>
              <th className="px-4 py-3">Cadence</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.rows.length === 0 && !dbError && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  No task templates match these filters.
                </td>
              </tr>
            )}
            {data.rows.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  <Link href={`/admin/tasks/${t.id}` as any} className="hover:underline">
                    {t.task_id ?? `#${t.id}`}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ehrc-navy">
                  <Link
                    href={`/admin/tasks/${t.id}` as any}
                    className="hover:underline"
                  >
                    {t.task_name}
                  </Link>
                  {t.subsystem && (
                    <div className="text-xs text-slate-500">{t.subsystem}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{t.system}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {t.cadence}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {t.actor_type}
                </td>
                <td className="px-4 py-3">
                  <DraftStatusPill status={t.draft_status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {t.active ? (
                    <span className="text-green-700">●</span>
                  ) : (
                    <span className="text-slate-400">○</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function DraftStatusPill({ status }: { status: string }) {
  const cls =
    status === "confirmed"
      ? "bg-green-100 text-green-800"
      : status === "rejected"
      ? "bg-red-100 text-red-700"
      : status === "amended"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{status}</span>
  );
}
