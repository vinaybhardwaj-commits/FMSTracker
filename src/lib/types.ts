/**
 * src/lib/types.ts — Shared types for FMSTracker.
 */

export type Cadence =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "statutory_renewal";

export type ActorType = "in_house" | "amc_supervised" | "statutory";

export type EvidenceRequired =
  | "selfie+photo"
  | "selfie+photo+reading"
  | "selfie+vendor_report+next_due_date";

export type DraftStatus = "proposed" | "confirmed" | "rejected" | "amended";

export type Criticality = "critical" | "high" | "medium" | "low";

export interface TaskTemplate {
  id: number;
  task_id: string | null;
  system: string;
  subsystem: string | null;
  location_or_asset: string | null;
  task_name: string;
  cadence: Cadence;
  frequency_in_days: number;
  cadence_anchor: string | null;
  actor_type: ActorType;
  amc_vendor_id: number | null;
  acceptance_criteria: string;
  evidence_required: EvidenceRequired;
  reference_policy: string | null;
  nabh_standard_ref: string | null;
  priority_weight: number;
  draft_status: DraftStatus;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: number;
  vendor_id: string | null;
  system: string;
  vendor_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  visit_cadence: string | null;
  scope_notes: string | null;
  active: boolean;
}

export const CADENCES: Cadence[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "statutory_renewal",
];

export const ACTOR_TYPES: ActorType[] = ["in_house", "amc_supervised", "statutory"];

export const EVIDENCE_TYPES: EvidenceRequired[] = [
  "selfie+photo",
  "selfie+photo+reading",
  "selfie+vendor_report+next_due_date",
];

export const DRAFT_STATUSES: DraftStatus[] = ["proposed", "confirmed", "rejected", "amended"];

/** Cadence → suggested frequency_in_days for the new-task form. */
export const CADENCE_DEFAULT_DAYS: Record<Cadence, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
  statutory_renewal: 0, // n/a — handled by current_expiry on statutory_items
};
