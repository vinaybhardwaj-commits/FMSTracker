/**
 * src/lib/reports.ts — AD1.6
 *
 * Report definitions + per-type query loaders + HMAC signature.
 *
 * v1.0 strategy: print-CSS HTML for "PDF" formats (V uses browser Cmd+P
 * to save as PDF — same NABH-ready output, zero new dep). CSV streamed
 * directly. Signature hash via HMAC-SHA-256 of (type + parameters + content
 * digest), embedded in HTML footer + CSV header line.
 *
 * report_history (migration 0004) gets a row per generation for forensic
 * trail. blob_url is currently the print-page URL (not actually a blob
 * since we don't store the rendered PDF); v1.x can upload to Vercel Blob
 * if persistent re-download is needed.
 */

import { sql } from "@/lib/db";

export type ReportType =
  | "task_completions"
  | "statutory_renewals"
  | "vendor_activity"
  | "audit_trail"
  | "crew_performance"
  | "compliance_summary";

export type ReportFormat = "pdf" | "csv";

export interface ReportTypeMeta {
  type: ReportType;
  label: string;
  description: string;
  formats: ReportFormat[];
  icon: string; // emoji-style hint, will become Lucide later
}

export const REPORT_TYPES: ReportTypeMeta[] = [
  { type: "task_completions", label: "Task completions", description: "All task instances by status across a date range, with photo/selfie evidence summary.", formats: ["pdf", "csv"], icon: "✓" },
  { type: "statutory_renewals", label: "Statutory renewals", description: "Renewal events from statutory_renewals + current expiry status by item.", formats: ["pdf", "csv"], icon: "📜" },
  { type: "vendor_activity", label: "Vendor activity", description: "Per-vendor task completions in a date range — useful for AMC reviews.", formats: ["csv"], icon: "🤝" },
  { type: "audit_trail", label: "Audit trail", description: "Full audit_log dump for a date range — forensic + NABH evidence.", formats: ["csv"], icon: "🗒" },
  { type: "crew_performance", label: "Crew performance", description: "Completion stats per crew member — average time-to-complete, quality flags.", formats: ["pdf", "csv"], icon: "👥" },
  { type: "compliance_summary", label: "NABH compliance summary", description: "Quarter-level rollup mapped to NABH FMS chapters. Headline NABH evidence document.", formats: ["pdf"], icon: "🏥" },
];

export function getReportMeta(type: string): ReportTypeMeta | null {
  return REPORT_TYPES.find((r) => r.type === type) ?? null;
}

export interface ReportParameters {
  date_from?: string;
  date_to?: string;
  system_filter?: string;
  vendor_id?: number;
  helper_filter?: string;
  quarter?: string; // "2026Q1" for compliance summary
}

// ============================================================================
// Loaders — one per report type. Each returns { columns, rows, summary }
// ============================================================================

export interface ReportData {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  summary: { label: string; value: string | number }[];
}

export async function loadTaskCompletions(p: ReportParameters): Promise<ReportData> {
  const from = p.date_from ?? "2000-01-01";
  const to = p.date_to ?? "2099-12-31";
  const sysFilter = p.system_filter ?? "";

  const conds: string[] = ["ti.due_date BETWEEN $1 AND $2"];
  const args: unknown[] = [from, to];
  if (sysFilter) {
    args.push(sysFilter);
    conds.push(`ti.system = $${args.length}`);
  }

  const queryText = `
    SELECT
      to_char(ti.due_date, 'YYYY-MM-DD') AS due_date,
      ti.task_name,
      ti.system,
      ti.location_or_asset,
      ti.status,
      ti.completed_by_name,
      to_char(ti.completed_at, 'YYYY-MM-DD HH24:MI') AS completed_at,
      CASE WHEN ti.selfie_url IS NULL OR ti.selfie_url = '' THEN 'no' ELSE 'yes' END AS has_selfie,
      CASE WHEN ti.photo_urls IS NULL OR array_length(ti.photo_urls, 1) = 0 THEN 'no' ELSE 'yes' END AS has_photos,
      ti.skip_reason
    FROM task_instances ti
    WHERE ${conds.join(" AND ")}
    ORDER BY ti.due_date DESC, ti.system, ti.task_name
    LIMIT 5000
  `;
  const { rows } = await (sql as any).query(queryText, args);

  const counts = rows.reduce(
    (acc: Record<string, number>, r: any) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<string, number>
  );
  return {
    columns: [
      { key: "due_date", label: "Due date" },
      { key: "task_name", label: "Task" },
      { key: "system", label: "System" },
      { key: "location_or_asset", label: "Location" },
      { key: "status", label: "Status" },
      { key: "completed_by_name", label: "Completed by" },
      { key: "completed_at", label: "Completed at" },
      { key: "has_selfie", label: "Selfie" },
      { key: "has_photos", label: "Photos" },
      { key: "skip_reason", label: "Skip reason" },
    ],
    rows,
    summary: [
      { label: "Total instances", value: rows.length },
      { label: "Done", value: counts["done"] ?? 0 },
      { label: "Overdue", value: counts["overdue"] ?? 0 },
      { label: "Skipped", value: counts["skipped"] ?? 0 },
    ],
  };
}

export async function loadStatutoryRenewals(p: ReportParameters): Promise<ReportData> {
  const from = p.date_from ?? "2000-01-01";
  const to = p.date_to ?? "2099-12-31";
  const { rows } = await sql`
    SELECT
      to_char(sr.renewed_at, 'YYYY-MM-DD') AS renewed_at,
      si.licence_id,
      si.item,
      si.authority,
      to_char(sr.previous_expiry, 'YYYY-MM-DD') AS previous_expiry,
      to_char(sr.new_expiry, 'YYYY-MM-DD') AS new_expiry,
      sr.notes,
      sr.certificate_url
    FROM statutory_renewals sr
    INNER JOIN statutory_items si ON si.id = sr.statutory_id
    WHERE sr.renewed_at::date BETWEEN ${from} AND ${to}
    ORDER BY sr.renewed_at DESC
  `;
  return {
    columns: [
      { key: "renewed_at", label: "Renewed" },
      { key: "licence_id", label: "Licence" },
      { key: "item", label: "Item" },
      { key: "authority", label: "Authority" },
      { key: "previous_expiry", label: "Previous expiry" },
      { key: "new_expiry", label: "New expiry" },
      { key: "notes", label: "Notes" },
      { key: "certificate_url", label: "Certificate URL" },
    ],
    rows,
    summary: [{ label: "Renewals recorded", value: rows.length }],
  };
}

export async function loadVendorActivity(p: ReportParameters): Promise<ReportData> {
  const from = p.date_from ?? "2000-01-01";
  const to = p.date_to ?? "2099-12-31";
  const { rows } = await sql`
    SELECT
      v.vendor_id, v.vendor_name, v.system,
      to_char(ti.due_date, 'YYYY-MM-DD') AS due_date,
      ti.task_name, ti.status, ti.completed_by_name,
      to_char(ti.completed_at, 'YYYY-MM-DD HH24:MI') AS completed_at,
      to_char(ti.vendor_next_due_date, 'YYYY-MM-DD') AS vendor_next_due_date
    FROM task_instances ti
    INNER JOIN task_templates tt ON tt.id = ti.template_id
    INNER JOIN vendors v ON v.id = tt.amc_vendor_id
    WHERE ti.due_date BETWEEN ${from} AND ${to}
    ORDER BY v.vendor_id, ti.due_date DESC
  `;
  return {
    columns: [
      { key: "vendor_id", label: "Vendor ID" },
      { key: "vendor_name", label: "Vendor" },
      { key: "system", label: "System" },
      { key: "due_date", label: "Due date" },
      { key: "task_name", label: "Task" },
      { key: "status", label: "Status" },
      { key: "completed_by_name", label: "Completed by" },
      { key: "completed_at", label: "Completed at" },
      { key: "vendor_next_due_date", label: "Next due" },
    ],
    rows,
    summary: [{ label: "Vendor task instances", value: rows.length }],
  };
}

export async function loadAuditTrail(p: ReportParameters): Promise<ReportData> {
  const from = p.date_from ?? "2000-01-01";
  const to = p.date_to ?? "2099-12-31";
  const { rows } = await sql`
    SELECT
      to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS at,
      changed_by_name,
      action,
      table_name,
      record_id,
      diff::text AS diff
    FROM audit_log
    WHERE created_at::date BETWEEN ${from} AND ${to}
    ORDER BY created_at DESC
    LIMIT 10000
  `;
  return {
    columns: [
      { key: "at", label: "Timestamp" },
      { key: "changed_by_name", label: "Actor" },
      { key: "action", label: "Action" },
      { key: "table_name", label: "Table" },
      { key: "record_id", label: "Record" },
      { key: "diff", label: "Diff (JSON)" },
    ],
    rows,
    summary: [{ label: "Audit events", value: rows.length }],
  };
}

export async function loadCrewPerformance(p: ReportParameters): Promise<ReportData> {
  const from = p.date_from ?? "2000-01-01";
  const to = p.date_to ?? "2099-12-31";
  const { rows } = await sql`
    SELECT
      d.name,
      d.device_uuid,
      COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date BETWEEN ${from} AND ${to})::int AS completed,
      COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date BETWEEN ${from} AND ${to} AND (ti.selfie_url IS NULL OR ti.selfie_url = ''))::int AS missing_selfie,
      COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date BETWEEN ${from} AND ${to} AND (ti.photo_urls IS NULL OR array_length(ti.photo_urls, 1) = 0))::int AS missing_photos,
      COUNT(ti.*) FILTER (WHERE ti.claimed_by_device = d.id AND ti.due_date BETWEEN ${from} AND ${to} AND ti.status = 'skipped')::int AS skipped,
      AVG(EXTRACT(EPOCH FROM (ti.completed_at - ti.claimed_at))/60)::int AS avg_minutes_to_complete
    FROM devices d
    LEFT JOIN task_instances ti ON (ti.completed_by_device = d.id OR ti.claimed_by_device = d.id)
    WHERE d.is_admin = FALSE
    GROUP BY d.id, d.name, d.device_uuid
    HAVING COUNT(ti.*) FILTER (WHERE ti.completed_by_device = d.id AND ti.due_date BETWEEN ${from} AND ${to}) > 0
    ORDER BY completed DESC
  `;
  return {
    columns: [
      { key: "name", label: "Crew member" },
      { key: "completed", label: "Completed" },
      { key: "missing_selfie", label: "No selfie" },
      { key: "missing_photos", label: "No photos" },
      { key: "skipped", label: "Skipped" },
      { key: "avg_minutes_to_complete", label: "Avg min" },
    ],
    rows,
    summary: [{ label: "Crew members with activity", value: rows.length }],
  };
}

export async function loadComplianceSummary(p: ReportParameters): Promise<ReportData> {
  // Quarter-based; default to current quarter
  let from: string, to: string;
  if (p.quarter && /^\d{4}Q[1-4]$/.test(p.quarter)) {
    const y = parseInt(p.quarter.slice(0, 4), 10);
    const q = parseInt(p.quarter.slice(5), 10);
    const startMonth = (q - 1) * 3;
    const start = new Date(y, startMonth, 1);
    const end = new Date(y, startMonth + 3, 0);
    from = start.toISOString().slice(0, 10);
    to = end.toISOString().slice(0, 10);
  } else {
    from = p.date_from ?? "2000-01-01";
    to = p.date_to ?? "2099-12-31";
  }
  const { rows: bySystem } = await sql`
    SELECT
      ti.system,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ti.status = 'done')::int AS done,
      COUNT(*) FILTER (WHERE ti.status = 'overdue')::int AS overdue,
      COUNT(*) FILTER (WHERE ti.status = 'skipped')::int AS skipped
    FROM task_instances ti
    WHERE ti.due_date BETWEEN ${from} AND ${to}
    GROUP BY ti.system
    ORDER BY ti.system
  `;
  const { rows: stat } = await sql`
    SELECT
      si.licence_id, si.item,
      to_char(si.current_expiry, 'YYYY-MM-DD') AS current_expiry,
      (si.current_expiry - CURRENT_DATE)::int AS days_until,
      (SELECT COUNT(*)::int FROM statutory_renewals sr WHERE sr.statutory_id = si.id AND sr.renewed_at::date BETWEEN ${from} AND ${to}) AS renewals_in_period
    FROM statutory_items si
    WHERE si.active = TRUE
    ORDER BY si.current_expiry ASC NULLS LAST
  `;
  const total = bySystem.reduce((sum: number, r: any) => sum + r.total, 0);
  const done = bySystem.reduce((sum: number, r: any) => sum + r.done, 0);
  const completionPct = total > 0 ? Math.round((100 * done) / total) : null;

  return {
    columns: [
      { key: "system", label: "System" },
      { key: "total", label: "Total" },
      { key: "done", label: "Done" },
      { key: "overdue", label: "Overdue" },
      { key: "skipped", label: "Skipped" },
    ],
    rows: bySystem,
    summary: [
      { label: "Period", value: `${from} → ${to}` },
      { label: "Total task instances", value: total },
      { label: "Completion rate", value: completionPct == null ? "—" : `${completionPct}%` },
      { label: "Statutory items active", value: stat.length },
      { label: "Statutory renewals in period", value: stat.reduce((s: number, r: any) => s + (r.renewals_in_period ?? 0), 0) },
      { label: "Statutory items expired or expiring < 30d", value: stat.filter((r: any) => r.days_until != null && r.days_until < 30).length },
    ],
  };
}

export async function loadReport(type: ReportType, params: ReportParameters): Promise<ReportData> {
  switch (type) {
    case "task_completions": return loadTaskCompletions(params);
    case "statutory_renewals": return loadStatutoryRenewals(params);
    case "vendor_activity": return loadVendorActivity(params);
    case "audit_trail": return loadAuditTrail(params);
    case "crew_performance": return loadCrewPerformance(params);
    case "compliance_summary": return loadComplianceSummary(params);
  }
}

// ============================================================================
// Signature
// ============================================================================

function getReportSecret(): string {
  return process.env.FMS_REPORT_SECRET || process.env.FMS_SESSION_SECRET || "fallback-not-set";
}

function utf8(s: string): ArrayBuffer {
  const u8 = new TextEncoder().encode(s);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}
function bytesToHex(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += u8[i].toString(16).padStart(2, "0");
  return s;
}

export async function computeSignature(type: ReportType, parameters: ReportParameters, contentDigest: string): Promise<string> {
  const payload = JSON.stringify({ type, parameters, contentDigest });
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(getReportSecret()) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, utf8(payload));
  return bytesToHex(sig);
}

export async function digestContent(content: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", utf8(content));
  return bytesToHex(buf).slice(0, 16); // short digest for embedding
}

// ============================================================================
// CSV
// ============================================================================

export function toCsv(data: ReportData): string {
  const headers = data.columns.map((c) => c.label);
  const rows = data.rows.map((r) =>
    data.columns.map((c) => csvEscape(r[c.key] ?? ""))
  );
  return "﻿" + [headers.map(csvEscape).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ============================================================================
// History
// ============================================================================

export async function recordHistory(
  type: ReportType,
  format: ReportFormat,
  parameters: ReportParameters,
  generatedBy: string,
  blobUrl: string,
  signatureHash: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO report_history (type, format, parameters, generated_by, blob_url, signature_hash)
      VALUES (${type}, ${format}, ${JSON.stringify(parameters)}::jsonb, ${generatedBy}, ${blobUrl}, ${signatureHash})
    `;
  } catch (e) {
    console.error("[reports] history insert failed:", (e as Error).message);
  }
}

export async function listHistory(limit: number = 100): Promise<unknown[]> {
  const { rows } = await sql`
    SELECT
      id::text,
      type,
      format,
      parameters,
      generated_by,
      to_char(generated_at, 'YYYY-MM-DD HH24:MI') AS generated_at,
      blob_url,
      signature_hash
    FROM report_history
    ORDER BY generated_at DESC
    LIMIT ${limit}
  `;
  return rows;
}
// trigger redeploy
