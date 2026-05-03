/**
 * src/app/admin/statutory/page.tsx — S17 statutory list.
 */

import Link from "next/link";
import { sql } from "@/lib/db";
import { tierForExpiry, type StatutoryTier } from "@/lib/statutory";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  licence_id: string | null;
  item: string;
  authority: string | null;
  current_expiry: string | null;
  active: boolean;
}

const TIER_TEXT: Record<StatutoryTier, string> = {
  critical: "EXPIRED", red: "URGENT", orange: "Plan now",
  yellow: "Coordinate", silent: "OK",
};
const TIER_BG: Record<StatutoryTier, string> = {
  critical: "bg-red-100 text-red-800",
  red: "bg-red-50 text-red-700",
  orange: "bg-orange-50 text-orange-700",
  yellow: "bg-yellow-50 text-yellow-700",
  silent: "bg-slate-50 text-slate-600",
};

export default async function StatutoryListPage() {
  let rows: Row[] = [];
  let dbError: string | null = null;
  try {
    const r = await sql<Row>`
      SELECT id, licence_id, item, authority, current_expiry::text AS current_expiry, active
      FROM statutory_items
    `;
    rows = r.rows;
  } catch (e) {
    dbError = (e as Error).message;
  }

  // Sort by days_to_expiry asc (lowest first)
  const enriched = rows.map((r) => ({ ...r, ...tierForExpiry(r.current_expiry) }));
  enriched.sort((a, b) => (a.days ?? 999999) - (b.days ?? 999999));

  return (
    <main className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={"/admin" as any} className="text-sm text-slate-500 hover:text-ehrc-navy">◀ Admin</Link>
          <div className="text-2xl font-bold text-ehrc-navy">Statutory licences</div>
          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{enriched.length}</div>
        </div>
        <Link href={"/admin/statutory/new" as any} className="rounded-lg bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + New licence
        </Link>
      </div>

      {dbError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{dbError}</div>}

      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Authority</th>
              <th className="px-3 py-3">Expiry</th>
              <th className="px-3 py-3">Tier</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {enriched.length === 0 && !dbError && (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-slate-500">No statutory items.</td></tr>
            )}
            {enriched.map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="px-3 py-3 font-mono text-xs text-slate-600">
                  <Link href={`/admin/statutory/${r.id}` as any} className="hover:underline">{r.licence_id ?? `#${r.id}`}</Link>
                </td>
                <td className="px-3 py-3 text-ehrc-navy">
                  <Link href={`/admin/statutory/${r.id}` as any} className="hover:underline">{r.item}</Link>
                </td>
                <td className="px-3 py-3 text-slate-700">{r.authority ?? "—"}</td>
                <td className="px-3 py-3 text-slate-700">
                  {r.current_expiry ?? <span className="text-slate-400">— not set</span>}
                  {r.days != null && (
                    <div className="text-[11px] text-slate-500">
                      {r.days < 0 ? `${Math.abs(r.days)}d expired` : `${r.days}d left`}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${TIER_BG[r.tier]}`}>{TIER_TEXT[r.tier]}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link href={`/admin/statutory/${r.id}/renew` as any} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-ehrc-navy hover:bg-slate-200">
                    Renew
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
