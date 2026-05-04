import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { VendorForm, type VendorFormValues } from "@/components/admin/vendors/VendorForm";
import { BoundTasksPanel } from "@/components/admin/BoundTasksPanel";
import { VendorActivityPanel } from "@/components/admin/vendors/VendorActivityPanel";

export const dynamic = "force-dynamic";

async function load(vid: number): Promise<VendorFormValues | null> {
  const { rows } = await sql`SELECT vendor_id, system, vendor_name, contact_name, phone, email, visit_cadence, scope_notes, active FROM vendors WHERE id = ${vid}`;
  const r = rows[0]; if (!r) return null;
  return {
    vendor_id: r.vendor_id ?? "", system: r.system ?? "", vendor_name: r.vendor_name ?? "",
    contact_name: r.contact_name ?? "", phone: r.phone ?? "", email: r.email ?? "",
    visit_cadence: r.visit_cadence ?? "", scope_notes: r.scope_notes ?? "", active: r.active ?? true,
  };
}

export default async function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  const { id } = await params;
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent(`/admin/vendors/${id}`));
  const vid = parseInt(id, 10);
  if (!Number.isFinite(vid)) notFound();
  const initial = await load(vid);
  if (!initial) notFound();
  return (
    <div>
      <div className="mb-4 text-sm"><Link href={"/admin/vendors" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">← Vendors</Link></div>
      <h1 className="mb-6 text-2xl font-bold text-ehrc-navy">{initial.vendor_id || `Vendor #${vid}`} · {initial.vendor_name}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <VendorForm vendorId={vid} initial={initial} />
          <VendorActivityPanel vendorId={vid} />
        </div>
        <div><BoundTasksPanel endpointPath={`/api/admin/vendors/${vid}/bound-tasks`} entityLabel="vendor" /></div>
      </div>
    </div>
  );
}
