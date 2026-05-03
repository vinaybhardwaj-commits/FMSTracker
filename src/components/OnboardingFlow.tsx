/**
 * src/components/OnboardingFlow.tsx — S01 First-launch flow.
 *
 * 3 internal steps: welcome → name → selfie.
 * On success: writes localStorage device + POSTs /api/devices/onboard,
 * then triggers onComplete() (parent page reloads to show S02).
 */

"use client";

import { useRef, useState } from "react";
import { compressImage, SELFIE_OPTS } from "@/lib/image";
import { setDevice, newDeviceUuid } from "@/lib/device";

interface Props {
  onComplete: () => void;
}

type Step = "welcome" | "name" | "selfie" | "saving";

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSelfiePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    void (async () => {
      try {
        const compressed = await compressImage(f, SELFIE_OPTS);
        setSelfieBlob(compressed);
        if (selfiePreview) URL.revokeObjectURL(selfiePreview);
        setSelfiePreview(URL.createObjectURL(compressed));
      } catch (err) {
        setError(`Couldn't process the selfie: ${(err as Error).message}`);
      }
    })();
  }

  async function finish() {
    if (!name.trim() || !selfieBlob) {
      setError("Selfie and name are both required.");
      return;
    }
    setStep("saving");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", new File([selfieBlob], "selfie.jpg", { type: "image/jpeg" }));
      form.append("prefix", "selfie");
      const upRes = await fetch("/api/upload-image", { method: "POST", body: form });
      if (!upRes.ok) {
        const d = await upRes.json().catch(() => ({}));
        throw new Error(d.error || `upload failed (${upRes.status})`);
      }
      const { url } = (await upRes.json()) as { url: string };

      const uuid = newDeviceUuid();
      const onbRes = await fetch("/api/devices/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_uuid: uuid, name: name.trim(), baseline_selfie_url: url }),
      });
      if (!onbRes.ok) {
        const d = await onbRes.json().catch(() => ({}));
        throw new Error(d.error || `onboard failed (${onbRes.status})`);
      }

      setDevice({ device_uuid: uuid, name: name.trim(), baseline_selfie_url: url });
      onComplete();
    } catch (err) {
      setError((err as Error).message);
      setStep("selfie");
    }
  }

  if (step === "welcome") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="text-3xl font-bold text-ehrc-navy">FMSTracker</div>
        <p className="text-base text-slate-600">
          Hospital facilities maintenance — log every check, every day.
        </p>
        <button
          onClick={() => setStep("name")}
          className="mt-6 w-full rounded-2xl bg-ehrc-blue px-6 py-4 text-lg font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Get started
        </button>
      </main>
    );
  }

  if (step === "name") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-6 py-12">
        <div className="mt-8">
          <div className="text-sm uppercase tracking-wide text-slate-500">Step 1 of 2</div>
          <div className="mt-2 text-2xl font-bold text-ehrc-navy">What's your name?</div>
          <p className="mt-2 text-sm text-slate-600">
            This is how the rest of the crew sees who claimed and completed each task.
          </p>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          enterKeyHint="next"
          placeholder="e.g., Ravi Kumar"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-lg focus:border-ehrc-blue focus:outline-none"
        />
        <div className="mt-auto flex flex-col gap-3 pb-6">
          <button
            onClick={() => setStep("selfie")}
            disabled={!name.trim()}
            className="w-full rounded-2xl bg-ehrc-blue px-6 py-4 text-lg font-medium text-white disabled:bg-slate-300"
          >
            Next
          </button>
        </div>
      </main>
    );
  }

  // selfie step (or saving)
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <div className="mt-8">
        <div className="text-sm uppercase tracking-wide text-slate-500">Step 2 of 2</div>
        <div className="mt-2 text-2xl font-bold text-ehrc-navy">Take a clear selfie</div>
        <p className="mt-2 text-sm text-slate-600">
          We'll use this as your baseline so others know it's you.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {selfiePreview ? (
          <img
            src={selfiePreview}
            alt="Your selfie"
            className="h-48 w-48 rounded-2xl border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
            No selfie yet
          </div>
        )}

        <label className="cursor-pointer rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-ehrc-navy hover:bg-slate-200">
          {selfiePreview ? "Retake" : "Open camera"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleSelfiePicked}
            disabled={step === "saving"}
          />
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-6">
        <button
          onClick={finish}
          disabled={!selfieBlob || step === "saving"}
          className="w-full rounded-2xl bg-ehrc-blue px-6 py-4 text-lg font-medium text-white disabled:bg-slate-300"
        >
          {step === "saving" ? "Saving…" : "All set"}
        </button>
        <button
          onClick={() => setStep("name")}
          disabled={step === "saving"}
          className="w-full rounded-xl px-6 py-3 text-sm text-slate-500 hover:bg-slate-100"
        >
          Back
        </button>
      </div>
    </main>
  );
}
