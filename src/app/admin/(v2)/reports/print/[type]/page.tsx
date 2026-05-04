import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import { PrintButton } from "@/components/admin/reports/PrintButton";
import {
  getReportMeta,
  loadReport,
  computeSignature,
  digestContent,
  recordHistory,
  type ReportParameters,
  type ReportType,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

interface SP { from?: string; to?: string; system?: string; vendor_id?: string; quarter?: string; }

export default async function PrintReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<SP>;
}) {
  const session = await getAdminSession();
  const { type } = await params;
  const sp = await searchParams;
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent(`/admin/reports/print/${type}?${new URLSearchParams(sp as any).toString()}`));
  const meta = getReportMeta(type);
  if (!meta) notFound();

  const reportParams: ReportParameters = {
    date_from: sp.from,
    date_to: sp.to,
    system_filter: sp.system,
    vendor_id: sp.vendor_id ? parseInt(sp.vendor_id, 10) : undefined,
    quarter: sp.quarter,
  };
  const data = await loadReport(type as ReportType, reportParams);
  const contentDigest = await digestContent(JSON.stringify(data));
  const signature = await computeSignature(type as ReportType, reportParams, contentDigest);
  const generatedAt = new Date().toLocaleString();

  // Record in history (fire-and-forget — don't block render)
  recordHistory(
    type as ReportType,
    "pdf",
    reportParams,
    "admin",
    `/admin/reports/print/${type}?${new URLSearchParams(sp as any).toString()}`,
    signature,
  );

  return (
    <div className="report-page">
      <div className="screen-only mb-4 flex items-center gap-3 print:hidden">
        <Link href={`/admin/reports/exports/${type}` as any} className="text-sm text-slate-500 hover:text-ehrc-navy hover:underline">← Back to form</Link>
        <PrintButton />
        <span className="text-xs text-slate-500">Use Cmd/Ctrl-P · Save as PDF</span>
      </div>

      <div className="report-letterhead">
        <div className="brand">EHRC · FMSTracker</div>
        <div className="meta">
          <div><strong>{meta.label}</strong></div>
          {(reportParams.date_from || reportParams.date_to) && (
            <div>Period: {reportParams.date_from ?? "—"} → {reportParams.date_to ?? "—"}</div>
          )}
          {reportParams.system_filter && <div>System filter: {reportParams.system_filter}</div>}
          {reportParams.quarter && <div>Quarter: {reportParams.quarter}</div>}
          <div className="muted">Generated {generatedAt} · by {session.role}</div>
        </div>
      </div>

      {data.summary.length > 0 && (
        <section className="report-summary">
          <h2>Summary</h2>
          <dl>
            {data.summary.map((s) => (
              <div key={s.label} className="kv">
                <dt>{s.label}</dt>
                <dd>{String(s.value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="report-data">
        <h2>Detail</h2>
        {data.rows.length === 0 ? (
          <p className="muted">No rows match the selected parameters.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>{data.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  {data.columns.map((c) => <td key={c.key}>{String(r[c.key] ?? "—")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="report-footer">
        <div className="sig">
          <div>Signature (HMAC-SHA-256):</div>
          <div className="sig-hash">{signature}</div>
        </div>
        <div className="muted">
          To verify: recompute HMAC of {`{type, parameters, contentDigest=${contentDigest}}`} using FMS_REPORT_SECRET.
        </div>
      </footer>

      <style>{`
        @media screen {
          .report-page { max-width: 8.5in; margin: 0 auto; padding: 24px; background: white; color: #0f172a; }
          .screen-only { display: flex; }
        }
        @media print {
          @page { size: letter; margin: 0.6in; }
          .screen-only, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          aside, header.sticky { display: none !important; }
        }
        .report-page { font-family: Arial, sans-serif; font-size: 11pt; }
        .report-letterhead { border-bottom: 2px solid #002054; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
        .report-letterhead .brand { font-weight: bold; font-size: 14pt; color: #002054; }
        .report-letterhead .meta { text-align: right; font-size: 10pt; color: #475569; }
        .report-letterhead .meta .muted { color: #94a3b8; font-size: 9pt; margin-top: 4px; }
        .report-summary { margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
        .report-summary h2, .report-data h2 { font-size: 12pt; color: #002054; margin: 0 0 8px; }
        .report-summary dl { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin: 0; }
        .report-summary dt { font-size: 9pt; color: #64748b; }
        .report-summary dd { margin: 0; font-weight: 600; color: #002054; }
        .report-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        .report-table thead { background: #f1f5f9; }
        .report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; vertical-align: top; }
        .report-table th { font-weight: 600; color: #334155; }
        .report-table tbody tr:nth-child(even) { background: #fafafa; }
        .report-footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 8pt; }
        .report-footer .sig { margin-bottom: 6px; }
        .report-footer .sig-hash { font-family: monospace; word-break: break-all; color: #334155; }
        .muted { color: #94a3b8; }
      `}</style>
    </div>
  );
}

