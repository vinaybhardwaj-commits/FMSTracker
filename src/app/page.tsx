/**
 * src/app/page.tsx — root route.
 *
 * Client-only branching: if no device_uuid in localStorage → S01 onboarding.
 * Otherwise → S02 today list (Phase 2.5 will fully implement this; for 2.1
 * we render a "S02 coming next" placeholder so the onboarding flow round-trip
 * is testable end-to-end immediately after deploy).
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { getDevice, clearDevice, type LocalDevice } from "@/lib/device";

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [device, setLocalDevice] = useState<LocalDevice | null>(null);

  useEffect(() => {
    setLocalDevice(getDevice());
    setHydrated(true);
  }, []);

  if (!hydrated) {
    // Avoid hydration mismatch + a flash of onboarding for already-set users
    return <main className="min-h-screen" />;
  }

  if (!device) {
    return (
      <OnboardingFlow
        onComplete={() => setLocalDevice(getDevice())}
      />
    );
  }

  // Phase 2.1 placeholder for S02. Replaced by the real today list in Phase 2.5.
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <header className="flex items-center gap-3">
        {device.baseline_selfie_url && (
          <img
            src={device.baseline_selfie_url}
            alt={device.name}
            className="h-10 w-10 rounded-full border border-slate-200 object-cover"
          />
        )}
        <div className="flex-1">
          <div className="text-sm text-slate-500">Hello,</div>
          <div className="text-base font-medium text-ehrc-navy">{device.name}</div>
        </div>
        <Link
          href={"/admin" as any}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-ehrc-navy hover:bg-slate-200"
        >
          Admin
        </Link>
      </header>

      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm uppercase tracking-wide text-slate-500">Phase 2.1 ✓</div>
        <div className="mt-1 text-lg font-semibold text-ehrc-navy">
          Onboarding complete
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Today's tasks list arrives in Phase 2.5. The engine cron (Phase 2.2) will
          start generating instances on its first scheduled run.
        </p>
      </div>

      <button
        onClick={() => {
          if (confirm("Clear this device's identity and re-onboard?")) {
            clearDevice();
            setLocalDevice(null);
          }
        }}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        Reset device identity
      </button>
    </main>
  );
}
