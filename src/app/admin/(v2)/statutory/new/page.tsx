import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import { StatutoryForm } from "@/components/admin/statutory/StatutoryForm";

export const dynamic = "force-dynamic";

export default async function NewStatutoryPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/statutory/new"));
  return (
    <div>
      <div className="mb-4 text-sm"><Link href={"/admin/statutory" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">← Statutory</Link></div>
      <h1 className="mb-6 text-2xl font-bold text-ehrc-navy">New statutory item</h1>
      <div className="max-w-3xl"><StatutoryForm /></div>
    </div>
  );
}
