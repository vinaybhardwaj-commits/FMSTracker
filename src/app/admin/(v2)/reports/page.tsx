import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import { REPORT_TYPES } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ReportsHubPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/reports"));
  const { tab } = await searchParams;
  const active = tab === "imports" ? "imports" : tab === "history" ? "history" : "exports";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">NABH-ready exports, audit trails, vendor activity, compliance summaries.</p>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6 text-sm font-medium" aria-label="Tabs">
          {[
            { key: "exports", label: "Exports" },
            { key: "imports", label: "Imports" },
            { key: "history", label: "History" },
          ].map((t) => (
            <Link
              key={t.key}
              href={t.key === "exports" ? "/admin/reports" : `/admin/reports?tab=${t.key}`}
              className={`border-b-2 px-1 pb-2 ${active === t.key ? "border-ehrc-blue text-ehrc-navy" : "border-transparent text-slate-500 hover:text-ehrc-navy"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {active === "exports" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((rt) => (
            <Link
              key={rt.type}
              href={`/admin/reports/exports/${rt.type}` as any}
              className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-ehrc-blue/50 hover:shadow-sm"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-2xl">{rt.icon}</span>
                <div className="flex gap-1">
                  {rt.formats.map((f) => (
                    <span key={f} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-600">{f}</span>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-base font-semibold text-ehrc-navy">{rt.label}</div>
              <p className="mt-1 text-xs text-slate-600">{rt.description}</p>
            </Link>
          ))}
        </div>
      )}

      {active === "imports" && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="text-base font-medium text-ehrc-navy">CSV imports ship in Phase 5</div>
          <div className="mt-1 text-sm text-slate-500">Bulk import for tasks, locations, vendors. Lands in v1.x.</div>
        </div>
      )}

      {active === "history" && <HistoryTab />}
    </div>
  );
}

async function HistoryTab() {
  const { listHistory } = await import("@/lib/reports");
  const rows = (await listHistory(100)) as Array<{
    id: string; type: string; format: string; parameters: Record<string, unknown>;
    generated_by: string; generated_at: string; blob_url: string; signature_hash: string | null;
  }>;
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="text-base font-medium text-ehrc-navy">No reports generated yet</div>
        <div className="mt-1 text-sm text-slate-500">When you generate a report from the Exports tab, it shows up here.</div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2 font-normal">When</th>
            <th className="px-3 py-2 font-normal">Type</th>
            <th className="px-3 py-2 font-normal">Format</th>
            <th className="px-3 py-2 font-normal">By</th>
            <th className="px-3 py-2 font-normal">Parameters</th>
            <th className="px-3 py-2 font-normal">Signature</th>
            <th className="px-3 py-2 font-normal">Re-open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="text-sm">
              <td className="px-3 py-2 text-slate-600">{r.generated_at}</td>
              <td className="px-3 py-2 font-medium text-ehrc-navy">{r.type}</td>
              <td className="px-3 py-2"><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono uppercase">{r.format}</span></td>
              <td className="px-3 py-2 text-slate-600">{r.generated_by}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-slate-500 truncate max-w-xs">{JSON.stringify(r.parameters).slice(0, 60)}</td>
              <td className="px-3 py-2 font-mono text-[10px] text-slate-400" title={r.signature_hash ?? ""}>{r.signature_hash ? r.signature_hash.slice(0, 12) + "…" : "—"}</td>
              <td className="px-3 py-2"><a href={r.blob_url} className="text-xs text-ehrc-blue hover:underline">Open →</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
