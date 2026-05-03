/**
 * src/app/instance/[id]/complete/done/page.tsx — S06.
 *
 * For the in_house and reading flows, this page kicks off the upload after
 * mount (since photos+reading screens collect data but don't submit). For
 * vendor flow the submit was already done on step 3, so this page just shows
 * the confirmation.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { getDevice } from "@/lib/device";
import { submitCompletion } from "@/lib/submit-completion";
import { getCaptureState, clearCaptureState } from "@/lib/capture-state";

interface CompletedView {
  task_name: string;
  selfie_url: string | null;
  photo_urls: string[] | null;
  reading_value: string | null;
  vendor_next_due_date: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
}

type Phase = "submitting" | "loaded" | "error";

export default function DonePage() {
  const params = useParams<{ id: string }>();
  const instanceId = parseInt(params.id, 10);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [device, setDevice] = useState<ReturnType<typeof getDevice>>(null);
  const [phase, setPhase] = useState<Phase>("submitting");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CompletedView | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [autoNavCancelled, setAutoNavCancelled] = useState(false);

  useEffect(() => {
    setDevice(getDevice());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !device) return;
    void (async () => {
      const state = getCaptureState(instanceId);
      try {
        // If we still have local capture state, this means we haven't
        // submitted yet (in_house / reading flows). Vendor flow clears
        // state on its own submit so getCaptureState returns empty.
        if (state.selfie) {
          await submitCompletion(instanceId, device.device_uuid);
        }
        const r = await fetch(`/api/instance/${instanceId}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { instance } = await r.json();
        setView(instance);
        setPhase("loaded");
        clearCaptureState(instanceId);
      } catch (e) {
        setPhase("error");
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, device, instanceId]);

  // 5s auto-nav after loaded
  useEffect(() => {
    if (phase !== "loaded" || autoNavCancelled) return;
    if (secondsLeft <= 0) {
      router.push("/" as never);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft, autoNavCancelled, router]);

  if (!hydrated) return <main className="min-h-screen bg-white" />;
  if (!device) return <OnboardingFlow onComplete={() => location.reload()} />;

  if (phase === "submitting") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="text-[40px]">⏳</div>
        <div className="mt-4 text-lg font-semibold text-ehrc-navy">Saving…</div>
        <div className="mt-1 text-sm text-slate-500">Uploading proof to the server.</div>
      </main>
    );
  }

  if (phase === "error" || !view) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="text-2xl text-red-700">Couldn't save</div>
        <div className="mt-2 text-sm text-slate-600">{error}</div>
        <button onClick={() => router.back()} className="mt-6 rounded-xl bg-ehrc-blue px-5 py-3 text-sm font-medium text-white">
          Go back and retry
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12 text-center">
      <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-ehrc-blue text-white text-3xl">
        ✓
      </div>
      <div className="mt-4 text-[22px] font-bold text-ehrc-navy">Saved</div>
      <div className="mt-2 text-[14px] text-slate-700">{view.task_name}</div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left" onClick={() => setAutoNavCancelled(true)}>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">Proof captured</div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          {view.selfie_url && (
            <img src={view.selfie_url} alt="Selfie" className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover" />
          )}
          {(view.photo_urls ?? []).slice(0, 6).map((u, i) => (
            <img key={i} src={u} alt={`Photo ${i + 1}`} className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover" />
          ))}
        </div>
        {view.reading_value && (
          <div className="mt-2 text-[13px] text-slate-700">Reading: {view.reading_value}</div>
        )}
        {view.vendor_next_due_date && (
          <div className="text-[13px] text-slate-700">Next service due: {view.vendor_next_due_date}</div>
        )}
        <div className="mt-2 text-[12px] text-slate-500">
          Submitted {view.completed_at ? new Date(view.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""} · {view.completed_by_name}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={() => router.push("/" as never)}
          className="w-full rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white"
        >
          Back to today
        </button>
        {!autoNavCancelled && (
          <div className="text-[11px] text-slate-500">Returning automatically in {secondsLeft}s…</div>
        )}
      </div>
    </main>
  );
}
