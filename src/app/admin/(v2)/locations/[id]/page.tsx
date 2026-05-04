import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { LocationForm, type LocationFormValues } from "@/components/admin/locations/LocationForm";
import { BoundTasksPanel } from "@/components/admin/BoundTasksPanel";

export const dynamic = "force-dynamic";

async function load(lid: number): Promise<LocationFormValues | null> {
  const { rows } = await sql`SELECT asset_id, system, name, floor, sub_location, count, criticality, notes, active FROM locations WHERE id = ${lid}`;
  const r = rows[0];
  if (!r) return null;
  return {
    asset_id: r.asset_id ?? "",
    system: r.system ?? "",
    name: r.name ?? "",
    floor: r.floor ?? "",
    sub_location: r.sub_location ?? "",
    count: r.count ?? null,
    criticality: r.criticality ?? "",
    notes: r.notes ?? "",
    active: r.active ?? true,
  };
}

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  const { id } = await params;
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent(`/admin/locations/${id}`));
  const lid = parseInt(id, 10);
  if (!Number.isFinite(lid)) notFound();
  const initial = await load(lid);
  if (!initial) notFound();
  return (
    <div>
      <div className="mb-4 text-sm"><Link href={"/admin/locations" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">← Locations</Link></div>
      <h1 className="mb-6 text-2xl font-bold text-ehrc-navy">{initial.asset_id || `Location #${lid}`} · {initial.name}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0"><LocationForm locationId={lid} initial={initial} /></div>
        <div><BoundTasksPanel endpointPath={`/api/admin/locations/${lid}/bound-tasks`} entityLabel="location" /></div>
      </div>
    </div>
  );
}
