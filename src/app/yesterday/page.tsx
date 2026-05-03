/**
 * src/app/yesterday/page.tsx — S07 route wrapper.
 */

"use client";

import { useEffect, useState } from "react";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { YesterdayPage } from "@/components/YesterdayPage";
import { getDevice, type LocalDevice } from "@/lib/device";
import type { RingsData } from "@/components/ProgressRings";

export default function YesterdayRoute() {
  const [hydrated, setHydrated] = useState(false);
  const [device, setLocalDevice] = useState<LocalDevice | null>(null);
  const [rings, setRings] = useState<RingsData>({ today: null, week: null, month: null });

  useEffect(() => {
    setLocalDevice(getDevice());
    setHydrated(true);
    fetch("/api/today")
      .then((r) => r.json())
      .then((p) => p.rings && setRings(p.rings))
      .catch(() => {});
  }, []);

  if (!hydrated) return <main className="min-h-screen bg-slate-50" />;
  if (!device) return <OnboardingFlow onComplete={() => setLocalDevice(getDevice())} />;
  return <YesterdayPage device={device} rings={rings} />;
}
