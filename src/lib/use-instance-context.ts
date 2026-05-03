/**
 * src/lib/use-instance-context.ts — shared loader for capture screens.
 */

"use client";

import { useEffect, useState } from "react";
import { getDevice, type LocalDevice } from "@/lib/device";

export interface InstanceMini {
  id: number;
  task_name: string;
  system: string;
  evidence_required: "selfie+photo" | "selfie+photo+reading" | "selfie+vendor_report+next_due_date";
  acceptance_criteria: string;
  vendor_id: number | null;
  vendor_name: string | null;
  vendor_phone: string | null;
  vendor_cadence: string | null;
  cadence: string | null;
}

export interface CaptureContext {
  hydrated: boolean;
  device: LocalDevice | null;
  instance: InstanceMini | null;
  error: string | null;
}

export function useCaptureContext(instanceId: number): CaptureContext {
  const [hydrated, setHydrated] = useState(false);
  const [device, setDevice] = useState<LocalDevice | null>(null);
  const [instance, setInstance] = useState<InstanceMini | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDevice(getDevice());
    setHydrated(true);
    fetch(`/api/instance/${instanceId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((p: { instance: InstanceMini }) => setInstance(p.instance))
      .catch((e) => setError((e as Error).message));
  }, [instanceId]);

  return { hydrated, device, instance, error };
}
