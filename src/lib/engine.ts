/**
 * src/lib/engine.ts — Cron-driven instance generation + carryover + claim cleanup.
 *
 * Ground rules:
 *  - "Today" is computed in IST (Asia/Kolkata). The cron runs at 04:00 IST = 22:30 UTC.
 *  - Tuned to the v1 seed data (see _spec/seed_tasks.csv): we recognize the
 *    specific anchor strings present, and fall back to time-since-last for anchors
 *    we can't deterministically interpret (e.g., "audit anniversary").
 *  - Idempotent via UNIQUE INDEX (template_id, due_date) — re-running the cron
 *    on the same day is a no-op.
 *  - Stale daily cleanup (May 2026): rows with status='overdue' AND
 *    due_date < (today - 1 day) AND cadence='daily' get auto-skipped at the
 *    start of each cron tick. Yesterday's overdue stays visible to workers
 *    for one full day before being pruned the next cron.
 *
 * V1.x backlog: real rotation logic for "rotating floors/zones/rooms" anchors;
 * per-template effective_from for annual anchors; per-vendor schedule sync;
 * extending stale cleanup beyond daily cadence (weekly+ keep overdue tail).
 */

import { sql } from "@vercel/postgres";

export type Cadence =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "statutory_renewal";

/** Returns today's date in IST as ISO YYYY-MM-DD. */
export function todayInIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/** Returns IST Date object (without time component meaningfully — for date math). */
function istDateParts(iso: string): { year: number; month: number; day: number; dow: number } {
  const [y, m, d] = iso.split("-").map(Number);
  // dow via Date constructed with the IST date — JS Date math is timezone-agnostic for date arithmetic
  const dt = new Date(Date.UTC(y, m - 1, d));
  return { year: y, month: m, day: d, dow: dt.getUTCDay() };
}

function lastDayOfMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/**
 * Decides if a template's anchor pattern says "fire today" based on cadence.
 * Returns false for unrecognized anchors; caller uses frequency_in_days fallback.
 */
export function matchesAnchorToday(
  todayIso: string,
  cadence: Cadence,
  anchor: string | null
): boolean {
  const { year, month, day, dow } = istDateParts(todayIso);

  if (cadence === "daily") return true;
  if (cadence === "statutory_renewal") return false; // not engine-driven

  if (!anchor) return false;
  const a = anchor.toLowerCase();

  if (cadence === "weekly") {
    if (a.includes("monday")) return dow === 1;
    if (a.includes("tuesday")) return dow === 2;
    if (a.includes("wednesday")) return dow === 3;
    if (a.includes("thursday")) return dow === 4;
    if (a.includes("friday")) return dow === 5;
    if (a.includes("saturday")) return dow === 6;
    if (a.includes("sunday")) return dow === 0;
    // "rotating floors/rooms/zones" — fire every Monday by default in v1;
    // real rotation logic is v1.x.
    if (a.includes("rotating")) return dow === 1;
    return false;
  }

  if (cadence === "monthly") {
    if (a.includes("1st monday") || a.includes("first monday")) {
      return dow === 1 && day <= 7;
    }
    if (a.includes("end of month")) return day === lastDayOfMonth(year, month);
    if (a.includes("15th")) return day === 15;
    if (a.includes("1st") || a.includes("first") || a.includes("calendar month")) return day === 1;
    if (a.includes("rotating")) return day === 1; // rotation deferred to v1.x
    return false;
  }

  if (cadence === "quarterly") {
    const isFirstMonthOfQuarter = month === 1 || month === 4 || month === 7 || month === 10;
    const isLastMonthOfQuarter = month === 3 || month === 6 || month === 9 || month === 12;
    if (a.includes("end of quarter")) {
      return isLastMonthOfQuarter && day === lastDayOfMonth(year, month);
    }
    if (a.includes("1st month") || a.includes("first month") || a.includes("calendar quarter")) {
      return isFirstMonthOfQuarter && day === 1;
    }
    return false;
  }

  if (cadence === "semi_annual") {
    if (a.includes("april") && a.includes("october")) {
      return (month === 4 || month === 10) && day === 1;
    }
    return false;
  }

  // annual — anniversary-based anchors not deterministically parseable
  // without an effective_from on the template. Caller falls back to
  // frequency_in_days check.
  return false;
}

/** Whether to use the time-since-last fallback for this cadence/anchor combo. */
export function needsFrequencyFallback(cadence: Cadence, anchor: string | null): boolean {
  if (cadence === "annual") return true;
  if (cadence === "semi_annual" && (!anchor || !/april|october/i.test(anchor))) return true;
  if (!anchor) return cadence !== "statutory_renewal" && cadence !== "daily";
  return false;
}

interface TemplateRow {
  id: number;
  cadence: Cadence;
  cadence_anchor: string | null;
  frequency_in_days: number;
  task_name: string;
  system: string;
  location_or_asset: string | null;
  acceptance_criteria: string;
  evidence_required: string;
  priority_weight: number;
  amc_vendor_id: number | null;
}

/**
 * Auto-skip stale daily-cadence overdue rows.
 *
 * Transitions task_instances where:
 *   - status = 'overdue'
 *   - due_date < (today - 1 day)
 *   - linked template cadence = 'daily'
 * to status = 'auto_skipped', writing one audit_log entry per row.
 *
 * Atomic: UPDATE + audit INSERT happen in a single SQL statement (multi-CTE
 * with side effects). Either both succeed or both roll back.
 *
 * Called from generateForToday() at the start of each cron tick (actor='system'),
 * and from scripts/backfill-stale-dailies.ts (actor='system-backfill') for the
 * one-time pile-up cleanup. Actor flows into audit_log.changed_by_name and
 * drives the Compliance Summary completionPct split (backfill rows excluded
 * from total denominator; ongoing system rows included).
 *
 * Daily cadence only — weekly+ cadences keep their existing overdue tail
 * (V's design call: longer cadences genuinely deserve a longer tail).
 *
 * Yesterday's overdue rows are intentionally untouched — they get one full
 * day of worker visibility before the next cron prunes them.
 */
export async function autoSkipStaleDailies(actor: "system" | "system-backfill" = "system"): Promise<{ skipped: number }> {
  const r = await sql<{ updated_count: number }>`
    WITH to_skip AS (
      SELECT i.id, i.template_id, i.status, i.due_date::text AS due_date, i.system, i.task_name,
             (CURRENT_DATE - i.due_date)::int AS days_overdue
      FROM task_instances i
      JOIN task_templates t ON t.id = i.template_id
      WHERE i.status = 'overdue'
        AND i.due_date < (CURRENT_DATE - INTERVAL '1 day')
        AND t.cadence = 'daily'
    ),
    updated AS (
      UPDATE task_instances
      SET status = 'auto_skipped'
      WHERE id IN (SELECT id FROM to_skip)
      RETURNING id
    ),
    audit AS (
      INSERT INTO audit_log (table_name, record_id, action, changed_by_device, changed_by_name, diff, created_at)
      SELECT 'task_instances',
             to_skip.id::text,
             'task.auto_skip.superseded',
             NULL,
             ${actor},
             jsonb_build_object(
               'reason', 'Auto-skipped: superseded by next day',
               'prior_status', to_skip.status,
               'due_date', to_skip.due_date,
               'days_overdue', to_skip.days_overdue,
               'system', to_skip.system,
               'task_name', to_skip.task_name
             ),
             NOW()
      FROM to_skip
      RETURNING id
    )
    SELECT (SELECT COUNT(*)::int FROM updated) AS updated_count
  `;
  return { skipped: r.rows[0]?.updated_count ?? 0 };
}

/**
 * Generation: auto-skips stale dailies, marks carryovers as overdue, then
 * inserts today's new instances. Returns counts. Safe to re-run on the same
 * day (UNIQUE INDEX prevents dups).
 */
export async function generateForToday(): Promise<{
  auto_skipped: number;
  carried_over: number;
  generated: number;
  considered: number;
  today: string;
}> {
  const today = todayInIST();

  // 1. Auto-skip stale daily-cadence overdue rows (status='overdue', due_date < today-1)
  const skip = await autoSkipStaleDailies("system");

  // 2. Carryover: mark prior pending/claimed as overdue
  const carry = await sql`
    UPDATE task_instances
    SET status = 'overdue'
    WHERE status IN ('pending', 'claimed')
      AND due_date < ${today}::date
    RETURNING id
  `;

  // 3. Pull active templates that the engine handles
  const tplResult = await sql<TemplateRow>`
    SELECT id, cadence, cadence_anchor, frequency_in_days, task_name, system,
           location_or_asset, acceptance_criteria, evidence_required, priority_weight,
           amc_vendor_id
    FROM task_templates
    WHERE active = TRUE AND cadence != 'statutory_renewal'
  `;

  let generated = 0;
  for (const t of tplResult.rows) {
    let shouldFire = matchesAnchorToday(today, t.cadence, t.cadence_anchor);

    if (!shouldFire && needsFrequencyFallback(t.cadence, t.cadence_anchor)) {
      const { rows: lastRows } = await sql`
        SELECT MAX(due_date)::text AS last_due FROM task_instances WHERE template_id = ${t.id}
      `;
      const last = (lastRows[0]?.last_due as string | null) ?? null;
      if (!last) {
        // never fired before — fire now to start the cadence
        shouldFire = true;
      } else {
        const dDays = Math.floor(
          (new Date(today + "T00:00:00Z").getTime() -
            new Date(last + "T00:00:00Z").getTime()) /
            86400_000
        );
        shouldFire = dDays >= t.frequency_in_days;
      }
    }

    if (!shouldFire) continue;

    // ON CONFLICT DO NOTHING (unique index on template_id, due_date)
    const ins = await sql`
      INSERT INTO task_instances (
        template_id, due_date, task_name, system, location_or_asset,
        acceptance_criteria, evidence_required, priority_weight, amc_vendor_id, status
      ) VALUES (
        ${t.id}, ${today}::date, ${t.task_name}, ${t.system}, ${t.location_or_asset},
        ${t.acceptance_criteria}, ${t.evidence_required}, ${t.priority_weight},
        ${t.amc_vendor_id}, 'pending'
      )
      ON CONFLICT (template_id, due_date) DO NOTHING
      RETURNING id
    `;
    if ((ins.rowCount ?? 0) > 0) generated++;
  }

  return {
    auto_skipped: skip.skipped,
    carried_over: carry.rowCount ?? 0,
    generated,
    considered: tplResult.rowCount ?? 0,
    today,
  };
}

/** Cleanup: free claims whose 30-min window has expired. */
export async function expireClaims(): Promise<{ expired: number; ids: number[] }> {
  const r = await sql`
    UPDATE task_instances
    SET status = 'pending',
        claimed_by_device = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL
    WHERE status = 'claimed' AND claim_expires_at < NOW()
    RETURNING id
  `;
  const ids = r.rows.map((row) => row.id as number);
  return { expired: r.rowCount ?? 0, ids };
}
