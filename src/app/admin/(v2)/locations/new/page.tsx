import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import { LocationForm } from "@/components/admin/locations/LocationForm";

export const dynamic = "force-dynamic";

export default async function NewLocationPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/locations/new"));
  return (
    <div>
      <div className="mb-4 text-sm"><Link href={"/admin/locations" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">← Locations</Link></div>
      <h1 className="mb-6 text-2xl font-bold text-ehrc-navy">New location</h1>
      <div className="max-w-3xl"><LocationForm /></div>
    </div>
  );
}
