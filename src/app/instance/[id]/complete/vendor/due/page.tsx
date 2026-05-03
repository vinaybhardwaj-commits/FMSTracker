/**
 * src/app/instance/[id]/complete/vendor/due/page.tsx — S05c step 3.
 *
 * Date picker with cadence-suggested default. Submit triggers the upload+
 * completion orchestration via the shared submitCompletion helper.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Stepper } from "@/components/Stepper";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useCaptureContext } from "@/lib/use-instance-context";
import { getCaptureState, saveCaptureState } from "@/lib/capture-state";
import { flowFor, activeStepIndex } from "@/lib/capture-flow";
import { submitCompletion } from "@/lib/submit-completion";

const CADENCE_DAYS: Record<string, number> = {
  daily: 1, weekly: 7, monthly: 30, quarterly: 90,
  semi_annual: 180, annual: 365,
};

function suggestedDate(cadence: string | null): string {
  const days: number = (cadence && CADENCE_DAYS[cadence]) || 90;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function VendorDuePage() {
  const params = useParams<{ id: string }>();
  const instanceId = parseInt(params.id, 10);
  const router = useRouter();
  const { hydrated, device, instance, error } = useCaptureContext(instanceId);
  const defaultDue = useMemo(() => suggestedDate(instance?.cadence ?? null), [instance?.cadence]);
  const [due, setDue] = useState(defaultDue);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isFinite(instanceId)) {
      const s = getCaptureState(instanceId);
      if (s.vendor_due) setDue(s.vendor_due);
      else setDue(defaultDue);
      if (s.notes) setNotes(s.notes);
    }
  }, [instanceId, defaultDue]);

  if (!hydrated) return <main className="min-h-screen bg-white" />;
  if (!device) return <OnboardingFlow onComplete={() => location.reload()} />;
  if (error) return <main className="p-6 text-sm text-red-700">{error}</main>;
  if (!instance) return <main className="p-6 text-sm text-slate-500">Loading…</main>;

  const steps = flowFor(instance.evidence_required);
  const activeIdx = activeStepIndex(steps, "vendor_due");

  async function handleSubmit() {
    if (submitting) return;
    if (due <= todayIso()) {
      setSubmitError("Date must be after today.");
      return;
    }
    if (!device) return;
    saveCaptureState(instanceId, { vendor_due: due, notes });
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitCompletion(instanceId, device.device_uuid);
      router.push(`/instance/${instanceId}/complete/done` as never);
    } catch (e) {
      setSubmitError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="flex h-14 items-center border-b border-slate-200 px-4">
        <button onClick={() => router.push(`/instance/${instanceId}/complete/vendor/report` as never)} className="text-sm text-slate-500">◀ Back</button>
        <div className="ml-3 flex-1 truncate text-[13px] text-slate-700">{instance.task_name}</div>
      </header>
      <Stepper steps={steps.map((s) => s.label)} active={activeIdx} />

      <div className="mx-auto max-w-md px-6 pb-32 pt-4">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">Step 3 of 3</div>
        <h1 className="mt-1 text-[22px] font-bold text-ehrc-navy">When's the next service due?</h1>
        {instance.cadence && <div className="mt-1 text-[14px] text-slate-600">Vendor's cadence is {instance.cadence}.</div>}
        <div className="mt-3 text-[14px] text-slate-700">Suggested: {defaultDue}</div>

        <input
          type="date"
          value={due}
          onChange={(e) => { setDue(e.target.value); saveCaptureState(instanceId, { vendor_due: e.target.value }); }}
          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-ehrc-blue focus:outline-none"
        />

        <label className="mt-6 block text-[13px] text-slate-600">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); saveCaptureState(instanceId, { notes: e.target.value }); }}
          className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none"
        />

        {submitError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pb-3 pt-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !due}
          className="w-full rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white disabled:bg-slate-300"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
        <button onClick={() => router.push(`/instance/${instanceId}` as never)} className="mt-1 w-full text-xs text-slate-500 hover:text-ehrc-navy">
          Cancel
        </button>
      </div>
    </main>
  );
}
