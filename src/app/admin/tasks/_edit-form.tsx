/**
 * src/app/admin/tasks/_edit-form.tsx
 *
 * Shared edit/create form for /admin/tasks/[id] and /admin/tasks/new.
 * Pure client component. Server pages pass `initial` (a TaskTemplate or null
 * for the create flow) and `vendors`.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CADENCES,
  ACTOR_TYPES,
  EVIDENCE_TYPES,
  DRAFT_STATUSES,
  CADENCE_DEFAULT_DAYS,
} from "@/lib/types";
import type {
  TaskTemplate,
  Cadence,
  ActorType,
  EvidenceRequired,
  DraftStatus,
  Vendor,
} from "@/lib/types";

type Mode = "create" | "edit";

interface Props {
  initial: TaskTemplate | null;
  vendors: Vendor[];
}

interface FormState {
  task_id: string;
  system: string;
  subsystem: string;
  location_or_asset: string;
  task_name: string;
  cadence: Cadence;
  frequency_in_days: number;
  cadence_anchor: string;
  actor_type: ActorType;
  amc_vendor_id: number | null;
  acceptance_criteria: string;
  evidence_required: EvidenceRequired;
  reference_policy: string;
  nabh_standard_ref: string;
  priority_weight: number;
  draft_status: DraftStatus;
  notes: string;
  active: boolean;
}

function emptyForm(): FormState {
  return {
    task_id: "",
    system: "",
    subsystem: "",
    location_or_asset: "",
    task_name: "",
    cadence: "daily",
    frequency_in_days: 1,
    cadence_anchor: "every day",
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
}

function fromInitial(t: TaskTemplate): FormState {
  return {
    task_id: t.task_id ?? "",
    system: t.system,
    subsystem: t.subsystem ?? "",
    location_or_asset: t.location_or_asset ?? "",
    task_name: t.task_name,
    cadence: t.cadence,
    frequency_in_days: t.frequency_in_days,
    cadence_anchor: t.cadence_anchor ?? "",
    actor_type: t.actor_type,
    amc_vendor_id: t.amc_vendor_id,
    acceptance_criteria: t.acceptance_criteria,
    evidence_required: t.evidence_required,
    reference_policy: t.reference_policy ?? "",
    nabh_standard_ref: t.nabh_standard_ref ?? "",
    priority_weight: t.priority_weight,
    draft_status: t.draft_status,
    notes: t.notes ?? "",
    active: t.active,
  };
}

export function TaskEditForm({ initial, vendors }: Props) {
  const router = useRouter();
  const mode: Mode = initial ? "edit" : "create";
  const [f, setF] = useState<FormState>(initial ? fromInitial(initial) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function changeCadence(c: Cadence) {
    setF((prev) => ({
      ...prev,
      cadence: c,
      frequency_in_days: CADENCE_DEFAULT_DAYS[c] || prev.frequency_in_days,
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const url = mode === "create" ? "/api/admin/templates" : `/api/admin/templates/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      router.push("/admin/tasks" as any);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function softDelete() {
    if (!initial) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      router.push("/admin/tasks" as any);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <a href="/admin/tasks" className="text-sm text-slate-500 hover:text-ehrc-navy">
          ← Tasks
        </a>
        <div className="mt-1 text-2xl font-bold text-ehrc-navy">
          {mode === "create" ? "New task" : `Edit · ${initial?.task_id ?? `#${initial?.id}`}`}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-xl bg-white p-6 ring-1 ring-slate-200">
        <Row label="Task ID" hint="e.g. FT-001 (auto-suggested for new)">
          <input
            value={f.task_id}
            onChange={(e) => update("task_id", e.target.value)}
            className={inputCls}
            placeholder="FT-XXX"
          />
        </Row>

        <Row label="Task name" required>
          <input
            value={f.task_name}
            onChange={(e) => update("task_name", e.target.value)}
            className={inputCls}
            required
          />
        </Row>

        <div className="grid grid-cols-2 gap-4">
          <Row label="System" required>
            <input
              value={f.system}
              onChange={(e) => update("system", e.target.value)}
              className={inputCls}
              placeholder="Fire Safety / MGPS / HVAC …"
              required
            />
          </Row>
          <Row label="Subsystem">
            <input
              value={f.subsystem}
              onChange={(e) => update("subsystem", e.target.value)}
              className={inputCls}
            />
          </Row>
        </div>

        <Row label="Location or asset">
          <input
            value={f.location_or_asset}
            onChange={(e) => update("location_or_asset", e.target.value)}
            className={inputCls}
            placeholder="GF Corridor / Main Fire Panel / All Floors …"
          />
        </Row>

        <div className="grid grid-cols-3 gap-4">
          <Row label="Cadence">
            <select value={f.cadence} onChange={(e) => changeCadence(e.target.value as Cadence)} className={inputCls}>
              {CADENCES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Row>
          <Row label="Days">
            <input
              type="number"
              value={f.frequency_in_days}
              onChange={(e) => update("frequency_in_days", parseInt(e.target.value, 10) || 0)}
              className={inputCls}
              min={0}
            />
          </Row>
          <Row label="Anchor" hint='"every Monday" / "1st of month"'>
            <input
              value={f.cadence_anchor}
              onChange={(e) => update("cadence_anchor", e.target.value)}
              className={inputCls}
            />
          </Row>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Row label="Actor type">
            <select value={f.actor_type} onChange={(e) => update("actor_type", e.target.value as ActorType)} className={inputCls}>
              {ACTOR_TYPES.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
          </Row>
          <Row label="AMC vendor" hint="Required if actor is amc_supervised or statutory">
            <select
              value={f.amc_vendor_id ?? ""}
              onChange={(e) => update("amc_vendor_id", e.target.value ? parseInt(e.target.value, 10) : null)}
              disabled={f.actor_type === "in_house"}
              className={inputCls}
            >
              <option value="">— none —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendor_name} ({v.system})
                </option>
              ))}
            </select>
          </Row>
        </div>

        <Row label="Acceptance criteria — what 'done' looks like" required>
          <textarea
            value={f.acceptance_criteria}
            onChange={(e) => update("acceptance_criteria", e.target.value)}
            className={`${inputCls} min-h-[100px]`}
            required
          />
        </Row>

        <Row label="Evidence required">
          <select
            value={f.evidence_required}
            onChange={(e) => update("evidence_required", e.target.value as EvidenceRequired)}
            className={inputCls}
          >
            {EVIDENCE_TYPES.map((e) => (<option key={e} value={e}>{e}</option>))}
          </select>
        </Row>

        <div className="grid grid-cols-2 gap-4">
          <Row label="Reference policy">
            <input value={f.reference_policy} onChange={(e) => update("reference_policy", e.target.value)} className={inputCls} />
          </Row>
          <Row label="NABH standard ref">
            <input value={f.nabh_standard_ref} onChange={(e) => update("nabh_standard_ref", e.target.value)} className={inputCls} />
          </Row>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Row label={`Priority weight (${f.priority_weight})`}>
            <input
              type="range"
              min={1}
              max={100}
              value={f.priority_weight}
              onChange={(e) => update("priority_weight", parseInt(e.target.value, 10))}
              className="w-full"
            />
          </Row>
          <Row label="Draft status">
            <select
              value={f.draft_status}
              onChange={(e) => update("draft_status", e.target.value as DraftStatus)}
              className={inputCls}
            >
              {DRAFT_STATUSES.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </Row>
        </div>

        <Row label="Notes">
          <textarea
            value={f.notes}
            onChange={(e) => update("notes", e.target.value)}
            className={`${inputCls} min-h-[60px]`}
          />
        </Row>

        <Row label="Active">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={f.active}
              onChange={(e) => update("active", e.target.checked)}
            />
            <span className="text-sm text-slate-700">
              {f.active ? "Generating new instances" : "Soft-deleted (no new instances)"}
            </span>
          </label>
        </Row>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {mode === "edit" && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700">Soft-delete?</span>
                <button onClick={softDelete} disabled={saving} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">
                  Confirm
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm text-slate-500">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-600 hover:underline">
                Soft-delete
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/tasks" className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-ehrc-blue px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

function Row({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
