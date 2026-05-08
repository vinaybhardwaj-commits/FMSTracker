/**
 * scripts/backfill-stale-dailies.ts
 *
 * One-time backfill: auto-skip the existing pile-up of stale daily-cadence
 * 'overdue' rows that accumulated before the engine cleanup step shipped
 * (May 2026, sprint engine-stale-cleanup).
 *
 * Default mode is DRY RUN — prints counts by system + 5 sample rows, NO writes.
 * Pass --commit to actually apply: opens a single transaction, UPDATEs all
 * matching rows to status='auto_skipped', INSERTs an audit_log entry per row
 * with changed_by_name='system-backfill'.
 *
 * The 'system-backfill' actor is what excludes these rows from the Compliance
 * Summary completion% denominator — the report distinguishes one-time cleanup
 * (excluded) from ongoing cron auto-skips (included).
 *
 * Usage (run from local clone with .env.local containing POSTGRES_URL):
 *   pnpm run backfill:stale-dailies            # dry run
 *   pnpm run backfill:stale-dailies -- --commit # apply
 *
 * Idempotent: safe to re-run. Once rows transition to 'auto_skipped', the
 * WHERE filter excludes them from subsequent runs (returns 0).
 *
 * IMPORTANT timing: run BEFORE the next 04:00 IST cron tick. Otherwise the
 * cron auto-skips the same pile-up with actor='system' (counts against
 * completion %) and the actor-split benefit is lost.
 */

import { createClient } from "@vercel/postgres";

interface SampleRow {
  id: number;
  template_id: number | null;
  task_name: string;
  system: string;
  due_date: string;
  days_overdue: number;
}

const FILTER_SQL = `
  i.status = 'overdue'
  AND i.due_date < (CURRENT_DATE - INTERVAL '1 day')
  AND t.cadence = 'daily'
`;

async function dryRun(client: ReturnType<typeof createClient>): Promise<void> {
  const bySystemRes = await client.query<{ system: string; count: number }>(`
    SELECT i.system, COUNT(*)::int AS count
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    WHERE ${FILTER_SQL}
    GROUP BY i.system
    ORDER BY count DESC
  `);

  const byTemplateRes = await client.query<{ template_id: number; task_name: string; count: number }>(`
    SELECT i.template_id, i.task_name, COUNT(*)::int AS count
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    WHERE ${FILTER_SQL}
    GROUP BY i.template_id, i.task_name
    ORDER BY count DESC
    LIMIT 10
  `);

  const samplesRes = await client.query<SampleRow>(`
    SELECT i.id, i.template_id, i.task_name, i.system,
           i.due_date::text AS due_date,
           (CURRENT_DATE - i.due_date)::int AS days_overdue
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    WHERE ${FILTER_SQL}
    ORDER BY i.due_date ASC
    LIMIT 5
  `);

  const total = bySystemRes.rows.reduce((s, r) => s + r.count, 0);

  console.log(`\nDRY RUN — would auto-skip ${total} rows across ${bySystemRes.rows.length} systems.\n`);

  if (total === 0) {
    console.log("No stale daily-cadence overdue rows found. Nothing to backfill.\n");
    return;
  }

  console.log("By system:");
  for (const r of bySystemRes.rows) {
    console.log(`  ${r.system.padEnd(8)}  ${String(r.count).padStart(6)} rows`);
  }

  console.log("\nTop 10 templates by pile-up size:");
  for (const r of byTemplateRes.rows) {
    console.log(`  template ${String(r.template_id).padStart(4)}  ${String(r.count).padStart(4)}× — ${r.task_name}`);
  }

  console.log("\n5 oldest sample rows:");
  for (const r of samplesRes.rows) {
    console.log(`  id=${r.id} '${r.task_name}' system=${r.system} due=${r.due_date} days_overdue=${r.days_overdue}`);
  }

  console.log("\nRun with --commit to apply.");
  console.log("Will write audit_log entries with changed_by_name='system-backfill'.");
  console.log("These rows will be excluded from Compliance Summary completion% denominator.\n");
}

async function commitBackfill(client: ReturnType<typeof createClient>): Promise<void> {
  console.log("\nApplying backfill in single transaction...");

  const r = await client.query<{ updated_count: number }>(`
    WITH to_skip AS (
      SELECT i.id, i.template_id, i.status, i.due_date::text AS due_date, i.system, i.task_name,
             (CURRENT_DATE - i.due_date)::int AS days_overdue
      FROM task_instances i
      JOIN task_templates t ON t.id = i.template_id
      WHERE ${FILTER_SQL}
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
             'system-backfill',
             jsonb_build_object(
               'reason', 'Auto-skipped: one-time backfill (engine-stale-cleanup sprint, May 2026)',
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
  `);

  const count = r.rows[0]?.updated_count ?? 0;
  console.log(`\n✓ Backfill complete. ${count} rows transitioned to status='auto_skipped'.`);
  console.log(`  Audit entries written with changed_by_name='system-backfill'.`);
  console.log(`  These rows are excluded from Compliance Summary completion% denominator.\n`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");

  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) {
    console.error("ERROR: POSTGRES_URL_NON_POOLING (or POSTGRES_URL) is not set.");
    console.error("Run `vercel env pull .env.local` first, then rerun this script.");
    process.exit(1);
  }

  console.log(`FMSTracker — backfill stale dailies`);
  console.log(`Mode: ${commit ? "COMMIT (writes will happen)" : "DRY RUN (no writes)"}`);
  console.log(`Filter: status='overdue' AND due_date < (today-1) AND cadence='daily'`);

  const client = createClient({ connectionString: url });
  await client.connect();

  try {
    if (commit) {
      await commitBackfill(client);
    } else {
      await dryRun(client);
    }
  } finally {
    await client.end();
  }
}

main().catch((e: Error) => {
  console.error("Backfill failed:", e.message);
  console.error(e.stack);
  process.exit(1);
});
