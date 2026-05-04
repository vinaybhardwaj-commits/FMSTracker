import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import { getReportMeta } from "@/lib/reports";
import { ReportParametersForm } from "@/components/admin/reports/ReportParametersForm";

export const dynamic = "force-dynamic";

export default async function ReportExportPage({ params }: { params: Promise<{ type: string }> }) {
  const session = await getAdminSession();
  const { type } = await params;
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent(`/admin/reports/exports/${type}`));
  const meta = getReportMeta(type);
  if (!meta) notFound();
  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={"/admin/reports" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">← Reports</Link>
      </div>
      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <h1 className="text-2xl font-bold text-ehrc-navy">{meta.label}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
      </div>
      <div className="max-w-2xl">
        <ReportParametersForm meta={meta} />
      </div>
    </div>
  );
}
