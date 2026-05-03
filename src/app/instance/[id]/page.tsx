/**
 * src/app/instance/[id]/page.tsx — S03 route wrapper.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TaskDetailPage } from "@/components/TaskDetailPage";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { getDevice, type LocalDevice } from "@/lib/device";
import type { RingsData } from "@/components/ProgressRings";

export default function InstancePage() {
  const params = useParams<{ id: string }>();
  const instanceId = parseInt(params.id, 10);
  const [hydrated, setHydrated] = useState(false);
  const [device, setLocalDevice] = useState<LocalDevice | null>(null);
  const [rings, setRings] = useState<RingsData>({ today: null, week: null, month: null });

  useEffect(() => {
    setLocalDevice(getDevice());
    setHydrated(true);
    // pull rings once on mount; the home page will pull again with full payload
    fetch("/api/today")
      .then((r) => r.json())
      .then((p) => p.rings && setRings(p.rings))
      .catch(() => {});
  }, []);

  if (!hydrated) return <main className="min-h-screen bg-slate-50" />;
  if (!device) return <OnboardingFlow onComplete={() => setLocalDevice(getDevice())} />;
  if (!Number.isFinite(instanceId)) {
    return (
      <main className="mx-auto mt-12 max-w-md px-4">
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-base font-semibold text-ehrc-navy">Invalid task link.</div>
        </div>
      </main>
    );
  }
  return <TaskDetailPage device={device} instanceId={instanceId} rings={rings} />;
}
