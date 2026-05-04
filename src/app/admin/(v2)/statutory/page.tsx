import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { StatutoryTable, type StatutoryRow } from "@/components/admin/statutory/StatutoryTable";

export const dynamic = "force-dynamic";

async function load(): Promise<{ rows: StatutoryRow[]; error: string | null }> {
  try {
    const { rows } = await sql`
      SELECT
        id, licence_id, item, authority,
        to_char(current_expiry, 'YYYY-MM-DD') AS current_expiry,
        CASE WHEN current_expiry IS NULL THEN NULL ELSE (current_expiry - CURRENT_DATE)::int END AS days_until,
        active
      FROM statutory_items
      ORDER BY current_expiry ASC NULLS LAST
    `;
    return { rows: rows as StatutoryRow[], error: null };
  } catch (e) {
    return { rows: [], error: (e as Error).message };
  }
}

export default async function StatutoryPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/statutory"));
  const { rows, error } = await load();
  const expiringSoon = rows.filter((r) => r.days_until != null && r.days_until < 30 && r.days_until > 0).length;
  const expired = rows.filter((r) => r.days_until != null && r.days_until <= 0).length;
  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ehrc-navy">Statutory</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} item{rows.length === 1 ? "" : "s"}
            {expired > 0 && <> · <span className="font-medium text-red-700">{expired} expired</span></>}
            {expiringSoon > 0 && <> · <span className="font-medium text-amber-700">{expiringSoon} expiring &lt; 30d</span></>}
          </p>
        </div>
        <Link href={"/admin/statutory/new" as any} className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90">+ New statutory item</Link>
      </div>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">DB unreachable: {error}</div>}
      <StatutoryTable rows={rows} />
    </div>
  );
}
