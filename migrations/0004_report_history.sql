-- AD1.0: report_history table for v1.0 Reports module (populated starting AD1.6).
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'task_completions',
    'statutory_renewals',
    'vendor_activity',
    'audit_trail',
    'crew_performance',
    'compliance_summary'
  )),
  format TEXT NOT NULL CHECK (format IN ('pdf','csv')),
  parameters JSONB NOT NULL,
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blob_url TEXT NOT NULL,
  signature_hash TEXT,
  file_size_bytes INT
);

CREATE INDEX IF NOT EXISTS idx_report_history_generated_at
  ON report_history(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_history_type
  ON report_history(type);
