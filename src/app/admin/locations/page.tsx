// src/app/admin/locations/page.tsx
import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LocationsList() {
  const { rows } = await sql`SELECT id, asset_id, system, name, floor, sub_location, count, criticality, active FROM locations ORDER BY system, name`;
  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={"/admin" as any} className="text-sm text-slate-500 hover:text-ehrc-navy">◀ Admin</Link>
          <div className="text-2xl font-bold text-ehrc-navy">Locations</div>
          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{rows.length}</div>
        </div>
        <Link href={"/admin/locations/new" as any} className="rounded-lg bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ New</Link>
      </div>
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">System</th><th className="px-3 py-2">Floor</th><th className="px-3 py-2">Sub</th><th className="px-3 py-2">Count</th><th className="px-3 py-2">Crit</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((r: any) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="px-3 py-2 font-mono text-xs"><Link href={`/admin/locations/${r.id}` as any} className="hover:underline">{r.asset_id ?? `#${r.id}`}</Link></td>
                <td className="px-3 py-2 text-ehrc-navy"><Link href={`/admin/locations/${r.id}` as any} className="hover:underline">{r.name}</Link></td>
                <td className="px-3 py-2 text-slate-700">{r.system}</td>
                <td className="px-3 py-2 text-slate-700">{r.floor ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.sub_location ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.count ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.criticality ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
