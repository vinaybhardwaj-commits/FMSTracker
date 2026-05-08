-- migrations/0005_engine_stale_cleanup.sql
-- Engine stale cleanup sprint: adds auto_skipped status + auto_skip audit action +
-- supporting index for the engine cleanup lookup (runs every cron tick at 04:00 IST).
--
-- Idempotent: safe to re-run.
--
-- Sprint: engine-stale-cleanup (May 2026)
-- See: Daily Dash EHRC/FMSTRACKER-ENGINE-STALE-CLEANUP-BUILD-SCOPE.md

-- 1. Allow 'auto_skipped' in task_instances.status
ALTER TABLE task_instances DROP CONSTRAINT IF EXISTS task_instances_status_check;
ALTER TABLE task_instances ADD CONSTRAINT task_instances_status_check
  CHECK (status IN ('pending','claimed','done','skipped','overdue','auto_skipped'));

-- 2. Allow 'task.auto_skip.superseded' in audit_log.action
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'create',
    'update',
    'delete',
    'soft_delete',
    'force_propagate',
    'statutory_renew',
    'pin_failure',
    'claim_expired',
    'task.auto_skip.superseded'
  ));

-- 3. Index backing the engine cleanup lookup
--    Engine queries: WHERE status = 'overdue' AND due_date < (today - 1)
CREATE INDEX IF NOT EXISTS idx_task_instances_status_due_date
  ON task_instances (status, due_date);
