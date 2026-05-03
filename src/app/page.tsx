/**
 * src/app/page.tsx — root route.
 *
 * Hydration-safe: no device → OnboardingFlow; device set → S02 today list.
 */

"use client";

import { useEffect, useState } from "react";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { TodayPage } from "@/components/TodayPage";
import { getDevice, type LocalDevice } from "@/lib/device";

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [device, setLocalDevice] = useState<LocalDevice | null>(null);

  useEffect(() => {
    setLocalDevice(getDevice());
    setHydrated(true);
  }, []);

  if (!hydrated) return <main className="min-h-screen bg-slate-50" />;

  if (!device) {
    return <OnboardingFlow onComplete={() => setLocalDevice(getDevice())} />;
  }

  return <TodayPage device={device} />;
}
