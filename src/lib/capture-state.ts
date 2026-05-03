/**
 * src/lib/capture-state.ts — sessionStorage helper for the completion flow.
 *
 * Persists captured blobs as data URLs keyed by instance_id so workers can
 * survive accidental refreshes / OS-back / brief tab switches mid-flow.
 */

const KEY_PREFIX = "fms_capture_";

export interface CaptureState {
  selfie?: string;        // data URL
  photos?: string[];      // data URLs
  reading_value?: string;
  notes?: string;
  vendor_onsite?: string;
  vendor_report?: string;
  vendor_due?: string;    // ISO date YYYY-MM-DD
}

export function getCaptureState(instanceId: number): CaptureState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(KEY_PREFIX + instanceId);
    if (!raw) return {};
    return JSON.parse(raw) as CaptureState;
  } catch {
    return {};
  }
}

export function saveCaptureState(instanceId: number, patch: Partial<CaptureState>): CaptureState {
  if (typeof window === "undefined") return patch;
  const existing = getCaptureState(instanceId);
  const next = { ...existing, ...patch };
  try {
    window.sessionStorage.setItem(KEY_PREFIX + instanceId, JSON.stringify(next));
  } catch (e) {
    console.warn("sessionStorage write failed:", e);
  }
  return next;
}

export function clearCaptureState(instanceId: number): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY_PREFIX + instanceId);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}
