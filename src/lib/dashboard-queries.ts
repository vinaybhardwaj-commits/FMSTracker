/**
 * src/lib/dashboard-queries.ts — AD1.1
 *
 * Shared SQL helpers for dashboard widgets. Each function is a single
 * round-trip to Neon. Date math runs server-side via CURRENT_DATE / INTERVAL
 * to keep widget JSON timezone-stable (everything in IST is acceptable —
 * Vercel functions use UTC but Postgres CURRENT_DATE follows server tz which
 * we treat as date-only for due_date comparisons).
 *
 * Schema notes (from migrations/0001_init.sql):
 *  - task_instances.status: 'pending' | 'claimed' | 'done' | 'skipped' | 'overdue'
 *  - task_instances.due_date is DATE; claim_expires_at, claimed_at, completed_at TIMESTAMPTZ
 *  - statutory_items: licence_id, item, current_expiry (DATE), active
 *  - audit_log: table_name, record_id, action, changed_by_name, diff, created_at
 */

import { sql } from "@/lib/db";

export interface TodaySnapshot {
  total: number;
  pending: number;
  claimed: number;
  done: number;
  skipped: number;
  overdue: number;
}

export async function queryTodaySnapshot(): Promise<TodaySnapshot> {
  const { rows } = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'claimed')::int AS claimed,
      COUNT(*) FILTER (WHERE status = 'done')::int AS done,
      COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
      COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
    FROM task_instances
    WHERE due_date = CURRENT_DATE
  `;
  const r = rows[0] ?? {};
  return {
    total: r.total ?? 0,
    pending: r.pending ?? 0,
    claimed: r.claimed ?? 0,
    done: r.done ?? 0,
    skipped: r.skipped ?? 0,
    overdue: r.overdue ?? 0,
  };
}

export interface YesterdayCompletion {
  total: number;
  done: number;
  overdue: number;
  skipped: number;
  completionPct: number | null;
  missingSelfie: number;
  missingPhotos: number;
  weekAvgPct: number | null;
}

export async function queryYesterdayCompletion(): Promise<YesterdayCompletion> {
  const { rows: y } = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'done')::int AS done,
      COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue,
      COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
      COUNT(*) FILTER (WHERE status = 'done' AND (selfie_url IS NULL OR selfie_url = ''))::int AS missing_selfie,
      COUNT(*) FILTER (WHERE status = 'done' AND (photo_urls IS NULL OR array_length(photo_urls, 1) = 0))::int AS missing_photos
    FROM task_instances
    WHERE due_date = CURRENT_DATE - INTERVAL '1 day'
  `;
  const r = y[0] ?? {};
  const total = r.total ?? 0;
  const done = r.done ?? 0;
  const completionPct = total > 0 ? Math.round((100 * done) / total) : null;

  // Trailing 7-day average (excluding yesterday for clean delta)
  const { rows: w } = await sql`
    SELECT AVG(daily_pct) AS avg_pct FROM (
      SELECT due_date,
        CASE WHEN COUNT(*) > 0
          THEN 100.0 * COUNT(*) FILTER (WHERE status = 'done') / COUNT(*)
          ELSE NULL END AS daily_pct
      FROM task_instances
      WHERE due_date BETWEEN CURRENT_DATE - INTERVAL '8 days' AND CURRENT_DATE - INTERVAL '2 days'
      GROUP BY due_date
    ) t
  `;
  const weekAvgPct =
    w[0]?.avg_pct != null ? Math.round(parseFloat(w[0].avg_pct)) : null;

  return {
    total,
    done,
    overdue: r.overdue ?? 0,
    skipped: r.skipped ?? 0,
    completionPct,
    missingSelfie: r.missing_selfie ?? 0,
    missingPhotos: r.missing_photos ?? 0,
    weekAvgPct,
  };
}

export interface AtRiskRow {
  instance_id: number;
  template_id: number | null;
  task_name: string;
  system: string;
  due_date: string;
  minutes_overdue?: number;
  minutes_left?: number;
  claimed_by_name?: string | null;
}

export interface AtRisk {
  unclaimedPastDue: AtRiskRow[];
  claimsExpiring: AtRiskRow[];
  overdue24h: AtRiskRow[];
}

export async function queryAtRisk(): Promise<AtRisk> {
  const { rows: u } = await sql`
    SELECT id AS instance_id, template_id, task_name, system, due_date,
      EXTRACT(EPOCH FROM (NOW() - due_date::timestamp))/60 AS minutes_overdue
    FROM task_instances
    WHERE status = 'pending' AND due_date < CURRENT_DATE
    ORDER BY due_date ASC LIMIT 10
  `;
  const { rows: e } = await sql`
    SELECT ti.id AS instance_id, ti.template_id, ti.task_name, ti.system, ti.due_date,
      EXTRACT(EPOCH FROM (ti.claim_expires_at - NOW()))/60 AS minutes_left,
      d.name AS claimed_by_name
    FROM task_instances ti
    LEFT JOIN devices d ON d.id = ti.claimed_by_device
    WHERE ti.status = 'claimed'
      AND ti.claim_expires_at IS NOT NULL
      AND ti.claim_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 minutes'
    ORDER BY ti.claim_expires_at ASC LIMIT 10
  `;
  const { rows: o } = await sql`
    SELECT id AS instance_id, template_id, task_name, system, due_date
    FROM task_instances
    WHERE status IN ('pending','claimed','overdue')
      AND due_date < CURRENT_DATE - INTERVAL '1 day'
    ORDER BY due_date ASC LIMIT 10
  `;
  return {
    unclaimedPastDue: u.map((r) => ({
      instance_id: r.instance_id,
      template_id: r.template_id,
      task_name: r.task_name,
      system: r.system,
      due_date: r.due_date,
      minutes_overdue: Math.round(parseFloat(r.minutes_overdue ?? "0")),
    })),
    claimsExpiring: e.map((r) => ({
      instance_id: r.instance_id,
      template_id: r.template_id,
      task_name: r.task_name,
      system: r.system,
      due_date: r.due_date,
      minutes_left: Math.round(parseFloat(r.minutes_left ?? "0")),
      claimed_by_name: r.claimed_by_name,
    })),
    overdue24h: o.map((r) => ({
      instance_id: r.instance_id,
      template_id: r.template_id,
      task_name: r.task_name,
      system: r.system,
      due_date: r.due_date,
    })),
  };
}

export interface StatutoryExpiringRow {
  id: number;
  licence_id: string | null;
  item: string;
  authority: string | null;
  current_expiry: string;
  days_remaining: number;
}

export async function queryStatutoryExpiring(
  withinDays: number = 30
): Promise<StatutoryExpiringRow[]> {
  const { rows } = await sql`
    SELECT id, licence_id, item, authority, current_expiry,
      (current_expiry - CURRENT_DATE)::int AS days_remaining
    FROM statutory_items
    WHERE active = TRUE
      AND current_expiry IS NOT NULL
      AND current_expiry <= CURRENT_DATE + (${withinDays} || ' days')::interval
    ORDER BY current_expiry ASC
    LIMIT 30
  `;
  return rows as StatutoryExpiringRow[];
}

export interface CompletionTrendPoint {
  date: string;
  completed: number;
  total: number;
  completion_pct: number | null;
}

export async function queryCompletionTrend(
  days: number = 14
): Promise<CompletionTrendPoint[]> {
  const { rows } = await sql`
    WITH days AS (
      SELECT generate_series(
        CURRENT_DATE - (${days - 1} || ' days')::interval,
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date AS d
    )
    SELECT
      to_char(d.d, 'YYYY-MM-DD') AS date,
      COALESCE(COUNT(ti.*) FILTER (WHERE ti.status = 'done'), 0)::int AS completed,
      COALESCE(COUNT(ti.*), 0)::int AS total,
      CASE WHEN COUNT(ti.*) > 0
        THEN ROUND(100.0 * COUNT(ti.*) FILTER (WHERE ti.status = 'done') / COUNT(ti.*))::int
        ELSE NULL
      END AS completion_pct
    FROM days d
    LEFT JOIN task_instances ti ON ti.due_date = d.d
    GROUP BY d.d
    ORDER BY d.d ASC
  `;
  return rows as CompletionTrendPoint[];
}

export interface CrewOnDutyRow {
  device_id: string;
  name: string;
  baseline_selfie_url: string | null;
  active_claims: number;
  completed_today: number;
  last_action_at: string | null;
}

export async function queryCrewOnDuty(): Promise<CrewOnDutyRow[]> {
  const { rows } = await sql`
    SELECT
      d.id AS device_id,
      d.name,
      d.baseline_selfie_url,
      COUNT(ti.*) FILTER (WHERE ti.status = 'claimed' AND ti.due_date = CURRENT_DATE)::int AS active_claims,
      COUNT(ti.*) FILTER (WHERE ti.status = 'done' AND ti.due_date = CURRENT_DATE)::int AS completed_today,
      GREATEST(MAX(ti.claimed_at), MAX(ti.completed_at)) AS last_action_at
    FROM devices d
    LEFT JOIN task_instances ti
      ON (ti.claimed_by_device = d.id OR ti.completed_by_device = d.id)
      AND ti.due_date = CURRENT_DATE
    WHERE d.is_admin = FALSE
    GROUP BY d.id, d.name, d.baseline_selfie_url
    HAVING COUNT(ti.*) FILTER (WHERE ti.due_date = CURRENT_DATE) > 0
    ORDER BY last_action_at DESC NULLS LAST
    LIMIT 20
  `;
  return rows as CrewOnDutyRow[];
}

export interface RecentAuditRow {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  changed_by_name: string | null;
  diff: Record<string, unknown> | null;
  created_at: string;
}

export async function queryRecentAudit(
  hours: number = 24,
  limit: number = 10
): Promise<RecentAuditRow[]> {
  const { rows } = await sql`
    SELECT id, table_name, record_id, action, changed_by_name, diff, created_at
    FROM audit_log
    WHERE created_at > NOW() - (${hours} || ' hours')::interval
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as RecentAuditRow[];
}
