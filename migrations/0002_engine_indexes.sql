-- 0002_engine_indexes.sql
-- Phase 2 engine: prevent duplicate instances per (template, due_date).

-- Unique index across (template_id, due_date). Postgres treats NULL as distinct,
-- so multiple rows with template_id=NULL (template later deleted) are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_instances_template_due
  ON task_instances(template_id, due_date);
