import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import { VendorForm } from "@/components/admin/vendors/VendorForm";

export const dynamic = "force-dynamic";

export default async function NewVendorPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/vendors/new"));
  return (
    <div>
      <div className="mb-4 text-sm"><Link href={"/admin/vendors" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">← Vendors</Link></div>
      <h1 className="mb-6 text-2xl font-bold text-ehrc-navy">New vendor</h1>
      <div className="max-w-3xl"><VendorForm /></div>
    </div>
  );
}
