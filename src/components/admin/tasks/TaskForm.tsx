/**
 * src/components/admin/tasks/TaskForm.tsx — AD1.2
 *
 * Shared form for new + edit. Wires useFormDraft + DraftRestorePrompt for
 * auto-save on every keystroke. Submit calls existing /api/admin/templates
 * (POST for create, PATCH for update).
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormDraft } from "@/lib/use-form-draft";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";
import { DraftRestorePrompt } from "@/components/admin/DraftRestorePrompt";

const CADENCES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "statutory_renewal",
] as const;

const ACTOR_TYPES = ["in_house", "amc_supervised", "statutory"] as const;

const EVIDENCE_REQUIRED = [
  "selfie+photo",
  "selfie+photo+reading",
  "selfie+vendor_report+next_due_date",
] as const;

const DRAFT_STATUSES = ["proposed", "confirmed", "rejected", "amended"] as const;

const FREQ_BY_CADENCE: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
  statutory_renewal: 365,
};

export interface TaskFormValues {
  task_id: string;
  system: string;
  subsystem: string;
  location_or_asset: string;
  task_name: string;
  cadence: string;
  frequency_in_days: number;
  cadence_anchor: string;
  actor_type: string;
  amc_vendor_id: number | null;
  acceptance_criteria: string;
  evidence_required: string;
  reference_policy: string;
  nabh_standard_ref: string;
  priority_weight: number;
  draft_status: string;
  notes: string;
  active: boolean;
}

const EMPTY: TaskFormValues = {
  task_id: "",
  system: "",
  subsystem: "",
  location_or_asset: "",
  task_name: "",
  cadence: "daily",
  frequency_in_days: 1,
  cadence_anchor: "",
  actor_type: "in_house",
  amc_vendor_id: null,
  acceptance_criteria: "",
  evidence_required: "selfie+photo",
  reference_policy: "",
  nabh_standard_ref: "",
  priority_weight: 50,
  draft_status: "proposed",
  notes: "",
  active: true,
};

interface TaskFormProps {
  /** Falsy for create; otherwise the existing template id. */
  templateId?: number;
  /** Initial values; for create, EMPTY is used. */
  initial?: TaskFormValues;
  /** Optional ref to call after a successful save (e.g., refresh in-flight panel). */
  onSaved?: (id: number) => void;
}

export function TaskForm({ templateId, initial, onSaved }: TaskFormProps) {
  const router = useRouter();
  const isEdit = !!templateId;
  const formId = isEdit ? `task_${templateId}` : "task_new";

  const [form, setForm] = useState<TaskFormValues>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const draft = useFormDraft<TaskFormValues>(formId, form);

  // Auto-snap frequency_in_days when cadence changes (unless user has manually overridden it)
  useEffect(() => {
    const expected = FREQ_BY_CADENCE[form.cadence];
    if (expected != null && form.frequency_in_days !== expected) {
      // Only auto-snap if cadence just changed and freq matches a known value
      // (gentle touch — don't fight users who set custom frequencies)
    }
  }, [form.cadence, form.frequency_in_days]);

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        task_id: form.task_id.trim() || undefined, // server auto-assigns if empty on create
      };
      const url = isEdit ? `/api/admin/templates/${templateId}` : `/api/admin/templates`;
      const res = await fetchWithAuthCatch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      draft.clearDraft();
      const newId = data.id ?? data.template?.id ?? templateId;
      setSavedToast(`Saved · ${new Date().toLocaleTimeString()}`);
      onSaved?.(newId);
      if (!isEdit && newId) {
        router.push(`/admin/tasks/${newId}` as any);
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {draft.hasDraft && draft.draftSavedAt && (
        <DraftRestorePrompt
          savedAt={draft.draftSavedAt}
          onRestore={() => {
            const restored = draft.restoreDraft();
            if (restored) setForm(restored);
          }}
          onDiscard={() => draft.discardDraft()}
        />
      )}

      <Section title="Identity">
        <Field label="Task ID" hint={isEdit ? "" : "Leave blank — auto-assigned"}>
          <input
            type="text"
            value={form.task_id}
            onChange={(e) => set("task_id", e.target.value)}
            className={inputCls}
            placeholder="e.g. FT-001"
          />
        </Field>
        <Field label="Task name" required>
          <input
            type="text"
            value={form.task_name}
            onChange={(e) => set("task_name", e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="System" required>
          <input
            type="text"
            value={form.system}
            onChange={(e) => set("system", e.target.value.toUpperCase())}
            required
            className={inputCls}
            placeholder="FT / MGPS / EL / …"
          />
        </Field>
        <Field label="Subsystem">
          <input
            type="text"
            value={form.subsystem}
            onChange={(e) => set("subsystem", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Location / Asset">
          <input
            type="text"
            value={form.location_or_asset}
            onChange={(e) => set("location_or_asset", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Cadence">
        <Field label="Cadence" required>
          <select
            value={form.cadence}
            onChange={(e) => {
              const c = e.target.value;
              set("cadence", c);
              if (FREQ_BY_CADENCE[c]) set("frequency_in_days", FREQ_BY_CADENCE[c]);
            }}
            className={inputCls}
          >
            {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Frequency (days)" required>
          <input
            type="number"
            min={1}
            value={form.frequency_in_days}
            onChange={(e) => set("frequency_in_days", parseInt(e.target.value, 10) || 1)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Cadence anchor" hint="e.g. 'every Monday', '1st of month', 'April + October'">
          <input
            type="text"
            value={form.cadence_anchor}
            onChange={(e) => set("cadence_anchor", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Doer + evidence">
        <Field label="Actor type" required>
          <select
            value={form.actor_type}
            onChange={(e) => set("actor_type", e.target.value)}
            className={inputCls}
          >
            {ACTOR_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="AMC vendor ID" hint="If actor_type is amc_supervised">
          <input
            type="number"
            value={form.amc_vendor_id ?? ""}
            onChange={(e) => set("amc_vendor_id", e.target.value === "" ? null : parseInt(e.target.value, 10))}
            className={inputCls}
          />
        </Field>
        <Field label="Acceptance criteria" required>
          <textarea
            value={form.acceptance_criteria}
            onChange={(e) => set("acceptance_criteria", e.target.value)}
            required
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field label="Evidence required" required>
          <select
            value={form.evidence_required}
            onChange={(e) => set("evidence_required", e.target.value)}
            className={inputCls}
          >
            {EVIDENCE_REQUIRED.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Compliance + ranking">
        <Field label="Reference policy">
          <input type="text" value={form.reference_policy}
            onChange={(e) => set("reference_policy", e.target.value)} className={inputCls} />
        </Field>
        <Field label="NABH standard ref">
          <input type="text" value={form.nabh_standard_ref}
            onChange={(e) => set("nabh_standard_ref", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Priority weight" hint="1–100, higher = ranks earlier on Today list">
          <input type="number" min={1} max={100}
            value={form.priority_weight}
            onChange={(e) => set("priority_weight", parseInt(e.target.value, 10) || 50)}
            className={inputCls} />
        </Field>
        <Field label="Draft status">
          <select value={form.draft_status}
            onChange={(e) => set("draft_status", e.target.value)} className={inputCls}>
            {DRAFT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Active">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active}
              onChange={(e) => set("active", e.target.checked)} />
            Generates new instances
          </label>
        </Field>
        <Field label="Notes">
          <textarea value={form.notes}
            onChange={(e) => set("notes", e.target.value)} rows={2} className={inputCls} />
        </Field>
      </Section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {savedToast && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {savedToast}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-ehrc-blue px-4 py-2 text-sm font-medium text-white hover:bg-ehrc-blue/90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create template"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/tasks" as any)}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <div className="ml-auto text-xs text-slate-500">
          {draft.hasDraft ? "Draft saved" : "Auto-saves draft every keystroke"}
        </div>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-ehrc-blue focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {children}
      </div>
    </fieldset>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </div>
      {children}
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </label>
  );
}
