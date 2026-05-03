/**
 * src/app/instance/[id]/complete/reading/page.tsx — S05b.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Stepper } from "@/components/Stepper";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useCaptureContext } from "@/lib/use-instance-context";
import { getCaptureState, saveCaptureState } from "@/lib/capture-state";
import { flowFor, activeStepIndex, nextStepRoute } from "@/lib/capture-flow";

export default function ReadingInputPage() {
  const params = useParams<{ id: string }>();
  const instanceId = parseInt(params.id, 10);
  const router = useRouter();
  const { hydrated, device, instance, error } = useCaptureContext(instanceId);
  const [reading, setReading] = useState("");
  const [notes, setNotes] = useState("");
  const [showFullCriteria, setShowFullCriteria] = useState(false);

  useEffect(() => {
    if (Number.isFinite(instanceId)) {
      const s = getCaptureState(instanceId);
      if (s.reading_value) setReading(s.reading_value);
      if (s.notes) setNotes(s.notes);
    }
  }, [instanceId]);

  if (!hydrated) return <main className="min-h-screen bg-white" />;
  if (!device) return <OnboardingFlow onComplete={() => location.reload()} />;
  if (error) return <main className="p-6 text-sm text-red-700">{error}</main>;
  if (!instance) return <main className="p-6 text-sm text-slate-500">Loading…</main>;

  const steps = flowFor(instance.evidence_required);
  const activeIdx = activeStepIndex(steps, "reading");

  const firstSentence = (instance.acceptance_criteria.match(/^[^.;\n]+[.;\n]?/)?.[0] ?? instance.acceptance_criteria).trim();
  const hasMore = firstSentence.length < instance.acceptance_criteria.trim().length;

  function persist(field: "reading_value" | "notes", value: string) {
    saveCaptureState(instanceId, { [field]: value });
  }

  function continueNext() {
    const next = nextStepRoute(steps, "reading", instanceId);
    router.push(next as never);
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="flex h-14 items-center border-b border-slate-200 px-4">
        <button onClick={() => router.push(`/instance/${instanceId}/complete/photos` as never)} className="text-sm text-slate-500">
          ◀ Back
        </button>
        <div className="ml-3 flex-1 truncate text-[13px] text-slate-700">{instance.task_name}</div>
      </header>
      <Stepper steps={steps.map((s) => s.label)} active={activeIdx} />

      <div className="mx-auto max-w-md px-6 pb-32 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reading</div>
        <h1 className="mt-1 text-[22px] font-bold text-ehrc-navy">What's the reading?</h1>

        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Acceptance criteria</div>
          <div className="mt-1 whitespace-pre-line text-[15px] text-slate-700">
            {showFullCriteria ? instance.acceptance_criteria : firstSentence}
          </div>
          {hasMore && (
            <button className="mt-1 text-[12px] text-slate-500 hover:text-ehrc-navy" onClick={() => setShowFullCriteria((v) => !v)}>
              {showFullCriteria ? "Show less ▴" : "Show all ▾"}
            </button>
          )}
        </div>

        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={reading}
          onChange={(e) => { setReading(e.target.value); persist("reading_value", e.target.value); }}
          autoFocus
          enterKeyHint="next"
          className="mt-6 w-full rounded-2xl border border-slate-300 px-4 py-5 text-center text-[36px] font-medium text-ehrc-navy focus:border-ehrc-blue focus:outline-none"
        />
        <div className="mt-1 text-[12px] text-slate-500">
          Type the value as it appears on the gauge. Include decimals if shown.
        </div>

        <label className="mt-6 block text-[13px] text-slate-600">Anything to flag? (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); persist("notes", e.target.value); }}
          placeholder="e.g., gauge needle was sticky, tapped to settle"
          className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none"
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pb-3 pt-3">
        <button
          onClick={continueNext}
          disabled={!reading.trim()}
          className="w-full rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white disabled:bg-slate-300"
        >
          Continue
        </button>
        <button onClick={() => router.push(`/instance/${instanceId}` as never)} className="mt-1 w-full text-xs text-slate-500 hover:text-ehrc-navy">
          Cancel
        </button>
      </div>
    </main>
  );
}
