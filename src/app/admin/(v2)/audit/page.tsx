import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { AuditTable, type AuditRow } from "@/components/admin/audit/AuditTable";
import { AuditFilters } from "@/components/admin/audit/AuditFilters";

export const dynamic = "force-dynamic";

interface SP { actor?: string; action?: string; table?: string; from?: string; to?: string; }

async function loadAudit(sp: SP): Promise<{ rows: AuditRow[]; actors: string[]; error: string | null }> {
  try {
    const conds: string[] = [];
    const args: unknown[] = [];
    function bind(v: unknown) { args.push(v); return `$${args.length}`; }
    if (sp.actor) conds.push(`changed_by_name = ${bind(sp.actor)}`);
    if (sp.action) conds.push(`action = ${bind(sp.action)}`);
    if (sp.table) conds.push(`table_name = ${bind(sp.table)}`);
    if (sp.from) conds.push(`created_at::date >= ${bind(sp.from)}::date`);
    if (sp.to) conds.push(`created_at::date <= ${bind(sp.to)}::date`);
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const queryText = `
      SELECT id, table_name, record_id, action, changed_by_name, session_id,
             to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at, diff
      FROM audit_log ${where}
      ORDER BY created_at DESC
      LIMIT 1000
    `;
    const { rows } = await (sql as any).query(queryText, args);
    const { rows: actorsRows } = await sql`SELECT DISTINCT changed_by_name FROM audit_log WHERE changed_by_name IS NOT NULL ORDER BY changed_by_name`;
    return {
      rows: rows as AuditRow[],
      actors: actorsRows.map((r: any) => r.changed_by_name as string),
      error: null,
    };
  } catch (e) {
    return { rows: [], actors: [], error: (e as Error).message };
  }
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/audit"));
  const sp = await searchParams;
  const { rows, actors, error } = await loadAudit(sp);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">{rows.length} event{rows.length === 1 ? "" : "s"} (latest 1000) · click 'View' on a row to expand its diff JSON.</p>
      </div>
      <AuditFilters availableActors={actors} />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">DB unreachable: {error}</div>}
      <AuditTable rows={rows} />
    </div>
  );
}
