// src/app/admin/vendors/page.tsx
import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VendorsList() {
  const { rows } = await sql`SELECT id, vendor_id, system, vendor_name, contact_name, phone, visit_cadence, active FROM vendors ORDER BY system, vendor_name`;
  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={"/admin" as any} className="text-sm text-slate-500 hover:text-ehrc-navy">◀ Admin</Link>
          <div className="text-2xl font-bold text-ehrc-navy">Vendors</div>
          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{rows.length}</div>
        </div>
        <Link href={"/admin/vendors/new" as any} className="rounded-lg bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ New</Link>
      </div>
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Vendor</th><th className="px-3 py-2">System</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Cadence</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((r: any) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="px-3 py-2 font-mono text-xs"><Link href={`/admin/vendors/${r.id}` as any} className="hover:underline">{r.vendor_id ?? `#${r.id}`}</Link></td>
                <td className="px-3 py-2 text-ehrc-navy"><Link href={`/admin/vendors/${r.id}` as any} className="hover:underline">{r.vendor_name}</Link></td>
                <td className="px-3 py-2 text-slate-700">{r.system}</td>
                <td className="px-3 py-2 text-slate-700">{r.contact_name ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.phone ? <a href={`tel:${r.phone}`} className="text-ehrc-blue hover:underline">{r.phone}</a> : "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.visit_cadence ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
