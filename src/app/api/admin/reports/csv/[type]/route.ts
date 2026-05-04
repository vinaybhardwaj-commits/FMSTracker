/**
 * GET /api/admin/reports/csv/[type]?from=&to=&system=&quarter= — AD1.6
 *
 * Streams a CSV report. Embeds a comment line at top with signature hash
 * so auditors can verify integrity. Records to report_history.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getReportMeta,
  loadReport,
  toCsv,
  computeSignature,
  digestContent,
  recordHistory,
  type ReportParameters,
  type ReportType,
} from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ type: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { type } = await ctx.params;
  const meta = getReportMeta(type);
  if (!meta || !meta.formats.includes("csv")) {
    return NextResponse.json({ ok: false, error: "csv_not_supported" }, { status: 400 });
  }

  const url = new URL(req.url);
  const params: ReportParameters = {
    date_from: url.searchParams.get("from") ?? undefined,
    date_to: url.searchParams.get("to") ?? undefined,
    system_filter: url.searchParams.get("system") ?? undefined,
    quarter: url.searchParams.get("quarter") ?? undefined,
  };

  const data = await loadReport(type as ReportType, params);
  const csvBody = toCsv(data);
  const contentDigest = await digestContent(csvBody);
  const signature = await computeSignature(type as ReportType, params, contentDigest);

  // Comment line at top of CSV with signature (Excel ignores lines starting with #).
  const header = `# FMSTracker · ${meta.label}\n# Generated: ${new Date().toISOString()}\n# Parameters: ${JSON.stringify(params)}\n# Signature: ${signature}\n`;
  const fullBody = header + csvBody;

  // Record history (non-blocking — but await so we don't lose entries on serverless cold spin-down)
  await recordHistory(
    type as ReportType, "csv", params, "admin",
    `/api/admin/reports/csv/${type}?${url.searchParams.toString()}`,
    signature,
  );

  const filename = `fmstracker-${type}-${(params.date_from ?? "")}-to-${(params.date_to ?? "")}.csv`;
  return new NextResponse(fullBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
