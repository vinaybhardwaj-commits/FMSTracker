-- AD1.0: Schema additions for admin v2.
-- Both columns are nullable; existing rows are unaffected.
-- All operations idempotent — safe to re-run.

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS session_id TEXT;

ALTER TABLE task_instances
  ADD COLUMN IF NOT EXISTS completion_quality_flag TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_instances_completion_quality_flag_check'
      AND table_name = 'task_instances'
  ) THEN
    ALTER TABLE task_instances
      ADD CONSTRAINT task_instances_completion_quality_flag_check
      CHECK (
        completion_quality_flag IS NULL OR
        completion_quality_flag IN (
          'photo_low_quality',
          'time_anomalous',
          'reading_out_of_band',
          'flagged_manual'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_log_session_id
  ON audit_log(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_instances_quality_flag
  ON task_instances(completion_quality_flag) WHERE completion_quality_flag IS NOT NULL;
