/**
 * src/lib/capture-flow.ts — derive stepper labels + next/prev routes from
 * an instance's evidence_required value.
 */

export type EvidenceRequired =
  | "selfie+photo"
  | "selfie+photo+reading"
  | "selfie+vendor_report+next_due_date";

export type StepKey = "selfie" | "photos" | "reading" | "vendor_onsite" | "vendor_report" | "vendor_due" | "done";

export interface FlowStep {
  key: StepKey;
  label: string;
  route: (id: number) => string;
}

const STEPS_BY_KEY: Record<StepKey, FlowStep> = {
  selfie:        { key: "selfie",        label: "Selfie",   route: (id) => `/instance/${id}/complete/selfie` },
  photos:        { key: "photos",        label: "Photo",    route: (id) => `/instance/${id}/complete/photos` },
  reading:       { key: "reading",       label: "Reading",  route: (id) => `/instance/${id}/complete/reading` },
  vendor_onsite: { key: "vendor_onsite", label: "On-site",  route: (id) => `/instance/${id}/complete/vendor/onsite` },
  vendor_report: { key: "vendor_report", label: "Report",   route: (id) => `/instance/${id}/complete/vendor/report` },
  vendor_due:    { key: "vendor_due",    label: "Due date", route: (id) => `/instance/${id}/complete/vendor/due` },
  done:          { key: "done",          label: "Done",     route: (id) => `/instance/${id}/complete/done` },
};

export function flowFor(ev: EvidenceRequired): FlowStep[] {
  if (ev === "selfie+photo") return [STEPS_BY_KEY.selfie, STEPS_BY_KEY.photos, STEPS_BY_KEY.done];
  if (ev === "selfie+photo+reading") return [STEPS_BY_KEY.selfie, STEPS_BY_KEY.photos, STEPS_BY_KEY.reading, STEPS_BY_KEY.done];
  return [STEPS_BY_KEY.selfie, STEPS_BY_KEY.vendor_onsite, STEPS_BY_KEY.vendor_report, STEPS_BY_KEY.vendor_due, STEPS_BY_KEY.done];
}

export function activeStepIndex(steps: FlowStep[], current: StepKey): number {
  const i = steps.findIndex((s) => s.key === current);
  return i >= 0 ? i : 0;
}

export function nextStepRoute(steps: FlowStep[], current: StepKey, instanceId: number): string {
  const i = activeStepIndex(steps, current);
  const next = steps[i + 1];
  return (next ?? STEPS_BY_KEY.done).route(instanceId);
}
