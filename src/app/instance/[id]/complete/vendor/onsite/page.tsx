/**
 * src/app/instance/[id]/complete/vendor/onsite/page.tsx — S05c step 1.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Stepper } from "@/components/Stepper";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useCaptureContext } from "@/lib/use-instance-context";
import { compressImage, PHOTO_OPTS } from "@/lib/image";
import { blobToDataUrl, getCaptureState, saveCaptureState } from "@/lib/capture-state";
import { flowFor, activeStepIndex, nextStepRoute } from "@/lib/capture-flow";

export default function VendorOnsitePage() {
  const params = useParams<{ id: string }>();
  const instanceId = parseInt(params.id, 10);
  const router = useRouter();
  const { hydrated, device, instance, error } = useCaptureContext(instanceId);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isFinite(instanceId)) {
      const s = getCaptureState(instanceId);
      if (s.vendor_onsite) setPhoto(s.vendor_onsite);
    }
  }, [instanceId]);

  if (!hydrated) return <main className="min-h-screen bg-white" />;
  if (!device) return <OnboardingFlow onComplete={() => location.reload()} />;
  if (error) return <main className="p-6 text-sm text-red-700">{error}</main>;
  if (!instance) return <main className="p-6 text-sm text-slate-500">Loading…</main>;

  const steps = flowFor(instance.evidence_required);
  const activeIdx = activeStepIndex(steps, "vendor_onsite");

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setCapError(null);
    try {
      const c = await compressImage(f, PHOTO_OPTS);
      const u = await blobToDataUrl(c);
      saveCaptureState(instanceId, { vendor_onsite: u });
      setPhoto(u);
    } catch (err) {
      setCapError(`Couldn't process photo: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="flex h-14 items-center border-b border-slate-200 px-4">
        <button onClick={() => router.push(`/instance/${instanceId}/complete/selfie` as never)} className="text-sm text-slate-500">◀ Back</button>
        <div className="ml-3 flex-1 truncate text-[13px] text-slate-700">{instance.task_name}</div>
      </header>
      <Stepper steps={steps.map((s) => s.label)} active={activeIdx} />

      <VendorContext instance={instance} />

      <div className="mx-auto max-w-md px-6 pb-32 pt-4">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">Step 1 of 3</div>
        <h1 className="mt-1 text-[22px] font-bold text-ehrc-navy">Vendor on-site</h1>
        <p className="mt-2 text-[15px] text-slate-700">Take a photo of the vendor doing the work, or their ID card.</p>

        <div className="mt-4">
          {!photo ? (
            <label className="flex aspect-square w-32 cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
              <span className="text-2xl">＋</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy} onChange={handle} />
            </label>
          ) : (
            <div className="relative w-32 overflow-hidden rounded-xl border border-slate-200">
              <img src={photo} alt="Vendor on-site" className="h-32 w-32 object-cover" />
              <label className="absolute right-1 top-1 cursor-pointer rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
                Retake
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
              </label>
            </div>
          )}
        </div>

        <div className="mt-3 text-[12px] text-slate-400">
          Vendor's company truck or toolkit also works if no ID is available.
        </div>

        {capError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{capError}</div>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pb-3 pt-3">
        <button
          onClick={() => router.push(nextStepRoute(steps, "vendor_onsite", instanceId) as never)}
          disabled={!photo}
          className="w-full rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white disabled:bg-slate-300"
        >
          Next: Report
        </button>
        <button onClick={() => router.push(`/instance/${instanceId}` as never)} className="mt-1 w-full text-xs text-slate-500 hover:text-ehrc-navy">
          Cancel
        </button>
      </div>
    </main>
  );
}

function VendorContext({ instance }: { instance: { vendor_name: string | null; vendor_phone: string | null; vendor_cadence: string | null } }) {
  if (!instance.vendor_name) return null;
  return (
    <div className="mx-4 mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[12px]">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">Vendor on this task</div>
      <div className="text-[13px] font-medium text-ehrc-navy">{instance.vendor_name}</div>
      <div className="text-slate-500">
        ☎ {instance.vendor_phone ?? "— (not set)"} · {instance.vendor_cadence ?? "— cadence not set"}
      </div>
    </div>
  );
}
