/**
 * src/lib/audit.ts — append-only audit log writer.
 *
 * Per PRD §4.2 audit_log captures admin edits + a few system events.
 * Worker actions (claim/release/skip/complete) are NOT audited per design —
 * task_instances row state already records them.
 *
 * Allowed actions (must match migration 0001 CHECK constraint):
 *   create | update | delete | soft_delete | force_propagate
 *   statutory_renew | pin_failure | claim_expired
 */

import { sql } from "@/lib/db";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "soft_delete"
  | "force_propagate"
  | "statutory_renew"
  | "pin_failure"
  | "claim_expired";

export interface AuditEntry {
  table: string;
  recordId: string | number;
  action: AuditAction;
  /** UUID PK from devices table — null when actor is admin (PIN session) or system (cron). */
  deviceId?: string | null;
  /** Display name — "admin", "system", or device.name */
  byName: string;
  /** JSONB payload — for updates, { before, after }; for create/delete, the row. */
  diff?: Record<string, unknown>;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_log (table_name, record_id, action, changed_by_device, changed_by_name, diff)
      VALUES (
        ${entry.table},
        ${String(entry.recordId)},
        ${entry.action},
        ${entry.deviceId ?? null}::uuid,
        ${entry.byName},
        ${JSON.stringify(entry.diff ?? {})}::jsonb
      )
    `;
  } catch (e) {
    // Audit is observational — never break the request because logging failed
    console.error("audit_log write failed:", (e as Error).message);
  }
}
