import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { VendorsTable, type VendorRow } from "@/components/admin/vendors/VendorsTable";

export const dynamic = "force-dynamic";

async function loadVendors(): Promise<{ rows: VendorRow[]; error: string | null }> {
  try {
    const { rows } = await sql`
      SELECT
        v.id, v.vendor_id, v.system, v.vendor_name, v.contact_name, v.phone,
        v.visit_cadence, v.active,
        (SELECT COUNT(*)::int FROM task_templates t WHERE t.amc_vendor_id = v.id) AS bound_task_count
      FROM vendors v
      ORDER BY v.system, v.vendor_id
    `;
    return { rows: rows as VendorRow[], error: null };
  } catch (e) {
    return { rows: [], error: (e as Error).message };
  }
}

export default async function VendorsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/vendors"));
  const { rows, error } = await loadVendors();
  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ehrc-navy">Vendors</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} vendor{rows.length === 1 ? "" : "s"} · {rows.filter(r => r.active).length} active</p>
        </div>
        <Link href={"/admin/vendors/new" as any} className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90">+ New vendor</Link>
      </div>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">DB unreachable: {error}</div>}
      <VendorsTable rows={rows} />
    </div>
  );
}
