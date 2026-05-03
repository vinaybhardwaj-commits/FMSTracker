/**
 * src/app/instance/[id]/complete/photos/page.tsx — S05 multi-photo.
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

const HARD_CAP = 6;
const SOFT_WARN = 4;

export default function PhotoCapturePage() {
  const params = useParams<{ id: string }>();
  const instanceId = parseInt(params.id, 10);
  const router = useRouter();
  const { hydrated, device, instance, error } = useCaptureContext(instanceId);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [capError, setCapError] = useState<string | null>(null);
  const [showFullCriteria, setShowFullCriteria] = useState(false);

  useEffect(() => {
    if (Number.isFinite(instanceId)) {
      const s = getCaptureState(instanceId);
      if (s.photos) setPhotos(s.photos);
    }
  }, [instanceId]);

  // Reset pending-delete after 1s
  useEffect(() => {
    if (pendingDelete === null) return;
    const id = setTimeout(() => setPendingDelete(null), 1000);
    return () => clearTimeout(id);
  }, [pendingDelete]);

  if (!hydrated) return <main className="min-h-screen bg-white" />;
  if (!device) return <OnboardingFlow onComplete={() => location.reload()} />;
  if (error) return <main className="p-6 text-sm text-red-700">{error}</main>;
  if (!instance) return <main className="p-6 text-sm text-slate-500">Loading…</main>;

  const steps = flowFor(instance.evidence_required);
  const activeIdx = activeStepIndex(steps, "photos");
  const reachedCap = photos.length >= HARD_CAP;

  const firstSentence = (instance.acceptance_criteria.match(/^[^.;\n]+[.;\n]?/)?.[0] ?? instance.acceptance_criteria).trim();
  const hasMore = firstSentence.length < instance.acceptance_criteria.trim().length;

  async function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCapError(null);
    setBusy(true);
    try {
      const compressed = await compressImage(f, PHOTO_OPTS);
      const dataUrl = await blobToDataUrl(compressed);
      const next = [...photos, dataUrl];
      saveCaptureState(instanceId, { photos: next });
      setPhotos(next);
      // Reset input so picking same file again works
      e.target.value = "";
    } catch (err) {
      setCapError(`Couldn't process photo: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function deletePhoto(idx: number) {
    if (pendingDelete !== idx) {
      setPendingDelete(idx);
      return;
    }
    const next = photos.filter((_, i) => i !== idx);
    saveCaptureState(instanceId, { photos: next });
    setPhotos(next);
    setPendingDelete(null);
  }

  function done() {
    const next = nextStepRoute(steps, "photos", instanceId);
    router.push(next as never);
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="flex h-14 items-center border-b border-slate-200 px-4">
        <button onClick={() => router.push(`/instance/${instanceId}/complete/selfie` as never)} className="text-sm text-slate-500">
          ◀ Back
        </button>
        <div className="ml-3 flex-1 truncate text-[13px] text-slate-700">{instance.task_name}</div>
      </header>
      <Stepper steps={steps.map((s) => s.label)} active={activeIdx} />

      <div className="mx-auto max-w-md px-6 pb-32 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Work proof</div>
        <h1 className="mt-1 whitespace-pre-line text-[18px] font-medium leading-snug text-ehrc-navy">
          {showFullCriteria ? instance.acceptance_criteria : firstSentence}
        </h1>
        {hasMore && (
          <button
            className="mt-1 text-[12px] text-slate-500 hover:text-ehrc-navy"
            onClick={() => setShowFullCriteria((v) => !v)}
          >
            {showFullCriteria ? "Show less ▴" : "Show all ▾"}
          </button>
        )}

        <div className="mt-4 text-[13px] text-slate-600">
          Photos taken: {photos.length}
          {photos.length >= SOFT_WARN && photos.length < HARD_CAP && (
            <span className="ml-2 text-slate-400">— looks thorough</span>
          )}
          {reachedCap && <span className="ml-2 text-amber-700">Max reached. Delete one to add another.</span>}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <label
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-slate-400 ${
              reachedCap ? "cursor-not-allowed border-slate-200 opacity-40" : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="text-2xl">＋</span>
            <span className="text-[11px]">{busy ? "Processing…" : "Take photo"}</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy || reachedCap} onChange={addPhoto} />
          </label>
          {photos.map((url, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200">
              <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => deletePhoto(idx)}
                className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${
                  pendingDelete === idx ? "bg-red-600" : "bg-black/50"
                }`}
                aria-label="Delete photo"
              >
                {pendingDelete === idx ? "✓" : "✕"}
              </button>
              {pendingDelete === idx && (
                <div className="absolute inset-x-0 bottom-0 bg-red-600/90 py-1 text-center text-[10px] text-white">
                  Tap again to delete
                </div>
              )}
            </div>
          ))}
        </div>

        {capError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{capError}</div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pb-3 pt-3">
        <button
          onClick={done}
          disabled={photos.length === 0}
          className="w-full rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white disabled:bg-slate-300"
        >
          {photos.length === 0 ? "Take a photo first" : `Done · ${photos.length} ${photos.length === 1 ? "photo" : "photos"}`}
        </button>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <button onClick={() => router.push(`/instance/${instanceId}` as never)} className="hover:text-ehrc-navy">
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}
