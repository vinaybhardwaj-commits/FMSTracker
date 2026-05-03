/**
 * src/app/instance/[id]/complete/selfie/page.tsx — S04.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Stepper } from "@/components/Stepper";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useCaptureContext } from "@/lib/use-instance-context";
import { compressImage, SELFIE_OPTS } from "@/lib/image";
import { blobToDataUrl, getCaptureState, saveCaptureState } from "@/lib/capture-state";
import { flowFor, activeStepIndex, nextStepRoute } from "@/lib/capture-flow";
import { getDevice } from "@/lib/device";

export default function SelfieCapturePage() {
  const params = useParams<{ id: string }>();
  const instanceId = parseInt(params.id, 10);
  const router = useRouter();
  const { hydrated, device, instance, error } = useCaptureContext(instanceId);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (Number.isFinite(instanceId)) {
      const s = getCaptureState(instanceId);
      if (s.selfie) setSelfieDataUrl(s.selfie);
    }
  }, [instanceId]);

  if (!hydrated) return <main className="min-h-screen bg-white" />;
  if (!device) return <OnboardingFlow onComplete={() => location.reload()} />;
  if (error) return <FlowError message={error} />;
  if (!instance) return <main className="min-h-screen bg-white p-6 text-sm text-slate-500">Loading…</main>;

  const steps = flowFor(instance.evidence_required);
  const activeIdx = activeStepIndex(steps, "selfie");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCapError(null);
    setBusy(true);
    try {
      const compressed = await compressImage(f, SELFIE_OPTS);
      const dataUrl = await blobToDataUrl(compressed);
      saveCaptureState(instanceId, { selfie: dataUrl });
      setSelfieDataUrl(dataUrl);
    } catch (err) {
      setCapError(`Couldn't process the selfie: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function useThis() {
    const next = nextStepRoute(steps, "selfie", instanceId);
    router.push(next as never);
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="flex h-14 items-center border-b border-slate-200 px-4">
        <button onClick={() => router.push(`/instance/${instanceId}` as never)} className="text-sm text-slate-500">
          ◀ Back
        </button>
        <div className="ml-3 flex-1 truncate text-[13px] text-slate-700">{instance.task_name}</div>
      </header>
      <Stepper steps={steps.map((s) => s.label)} active={activeIdx} />

      <div className="mx-auto max-w-md px-6 pb-32 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Selfie proof</div>
        <h1 className="mt-1 text-[20px] font-bold leading-snug text-ehrc-navy">
          Take a fresh selfie now to prove you're at the work area.
        </h1>

        {!selfieDataUrl ? (
          <div className="mt-6 flex items-start gap-4">
            {device.baseline_selfie_url && (
              <img src={device.baseline_selfie_url} alt="Your baseline" className="h-20 w-20 rounded-xl border border-slate-200 object-cover" />
            )}
            <div className="flex-1 text-[13px] text-slate-600">
              This is your baseline selfie. Match the angle if you can.
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="text-sm font-medium text-green-700">Selfie captured ✓</div>
            <img src={selfieDataUrl} alt="Captured selfie" className="w-full max-w-sm rounded-2xl border border-slate-200 object-cover" />
            <div className="flex items-center gap-3">
              {device.baseline_selfie_url && (
                <div className="flex flex-col items-center gap-1">
                  <img src={device.baseline_selfie_url} alt="Baseline" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Baseline</div>
                </div>
              )}
              <div className="flex flex-col items-center gap-1">
                <img src={selfieDataUrl} alt="This selfie" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                <div className="text-[10px] uppercase tracking-wide text-slate-500">This</div>
              </div>
            </div>
          </div>
        )}

        {capError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{capError}</div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pb-3 pt-3">
        {!selfieDataUrl ? (
          <label className="flex w-full cursor-pointer items-center justify-center rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white">
            {busy ? "Processing…" : "📷 Open camera"}
            <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} disabled={busy} />
          </label>
        ) : (
          <div className="flex flex-col gap-2">
            <button onClick={useThis} className="w-full rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white">
              Use this
            </button>
            <label className="flex w-full cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-100">
              Retake
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} disabled={busy} />
            </label>
          </div>
        )}
        <button onClick={() => router.push(`/instance/${instanceId}` as never)} className="mt-1 w-full text-xs text-slate-500 hover:text-ehrc-navy">
          Cancel
        </button>
      </div>
    </main>
  );
}

function FlowError({ message }: { message: string }) {
  return (
    <main className="mx-auto mt-12 max-w-md px-4">
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <div className="text-base font-semibold text-ehrc-navy">Couldn't open this task.</div>
        <div className="mt-1 text-sm text-slate-500">{message}</div>
        <a href="/" className="mt-4 inline-block rounded-lg bg-ehrc-blue px-4 py-2 text-sm text-white">Back to today</a>
      </div>
    </main>
  );
}
