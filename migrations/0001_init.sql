-- 0001_init.sql
-- FMSTracker Phase 1 schema — all 7 tables from PRD §5 + indexes.
-- Idempotent: every CREATE uses IF NOT EXISTS so reruns are safe.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Devices (no auth, identity ledger)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  baseline_selfie_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Locations / Assets
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  asset_id TEXT UNIQUE,
  system TEXT NOT NULL,
  name TEXT NOT NULL,
  floor TEXT,
  sub_location TEXT,
  count INTEGER,
  criticality TEXT CHECK (criticality IN ('critical','high','medium','low')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. AMC Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  vendor_id TEXT UNIQUE,
  system TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  visit_cadence TEXT,
  scope_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Task Templates (the editable register)
CREATE TABLE IF NOT EXISTS task_templates (
  id SERIAL PRIMARY KEY,
  task_id TEXT UNIQUE,
  system TEXT NOT NULL,
  subsystem TEXT,
  location_or_asset TEXT,
  task_name TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily','weekly','monthly','quarterly','semi_annual','annual','statutory_renewal')),
  frequency_in_days INTEGER NOT NULL,
  cadence_anchor TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('in_house','amc_supervised','statutory')),
  amc_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  acceptance_criteria TEXT NOT NULL,
  evidence_required TEXT NOT NULL CHECK (evidence_required IN ('selfie+photo','selfie+photo+reading','selfie+vendor_report+next_due_date')),
  reference_policy TEXT,
  nabh_standard_ref TEXT,
  priority_weight INTEGER NOT NULL DEFAULT 50 CHECK (priority_weight BETWEEN 1 AND 100),
  draft_status TEXT NOT NULL DEFAULT 'proposed' CHECK (draft_status IN ('proposed','confirmed','rejected','amended')),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Task Instances (engine-generated, snapshots template at creation)
CREATE TABLE IF NOT EXISTS task_instances (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES task_templates(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  -- Snapshot fields (immutable once created)
  task_name TEXT NOT NULL,
  system TEXT NOT NULL,
  location_or_asset TEXT,
  acceptance_criteria TEXT NOT NULL,
  evidence_required TEXT NOT NULL,
  priority_weight INTEGER,
  amc_vendor_id INTEGER,
  -- State
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','done','skipped','overdue')),
  claimed_by_device UUID REFERENCES devices(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  claim_expires_at TIMESTAMPTZ,
  -- Completion
  completed_by_device UUID REFERENCES devices(id) ON DELETE SET NULL,
  completed_by_name TEXT,
  completed_at TIMESTAMPTZ,
  selfie_url TEXT,
  photo_urls TEXT[],
  reading_value TEXT,
  vendor_report_url TEXT,
  vendor_present_photo_url TEXT,
  vendor_next_due_date DATE,
  -- Other
  skip_reason TEXT,
  carryover_from_id INTEGER REFERENCES task_instances(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instances_due_status ON task_instances(due_date, status);
CREATE INDEX IF NOT EXISTS idx_instances_claimed ON task_instances(claimed_by_device, claim_expires_at);

-- 6. Statutory Items
CREATE TABLE IF NOT EXISTS statutory_items (
  id SERIAL PRIMARY KEY,
  licence_id TEXT UNIQUE,
  item TEXT NOT NULL,
  authority TEXT,
  current_expiry DATE,
  current_certificate_url TEXT,
  source_doc TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Statutory Renewals (history of renewal events)
CREATE TABLE IF NOT EXISTS statutory_renewals (
  id SERIAL PRIMARY KEY,
  statutory_id INTEGER NOT NULL REFERENCES statutory_items(id) ON DELETE CASCADE,
  renewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  renewed_by_device UUID REFERENCES devices(id) ON DELETE SET NULL,
  previous_expiry DATE,
  new_expiry DATE NOT NULL,
  certificate_url TEXT,
  notes TEXT
);

-- 8. Audit log for admin edits + key engine events
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','soft_delete','force_propagate','statutory_renew','pin_failure','claim_expired')),
  changed_by_device UUID REFERENCES devices(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- updated_at autobump trigger (applied to mutable tables)
CREATE OR REPLACE FUNCTION fms_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['locations','vendors','task_templates','task_instances','statutory_items']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I; CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fms_set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END$$;
