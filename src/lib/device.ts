/**
 * src/lib/device.ts — Client-side device identity helpers.
 *
 * Persists { device_uuid, name } in localStorage under one key.
 * UUID is generated on first onboarding; reused for the device's lifetime.
 */

const KEY = "fms_device";

export interface LocalDevice {
  device_uuid: string;
  name: string;
  baseline_selfie_url: string | null;
}

export function getDevice(): LocalDevice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDevice;
    if (!parsed.device_uuid || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDevice(d: LocalDevice): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(d));
}

export function clearDevice(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** crypto.randomUUID is available in modern browsers + edge runtime. */
export function newDeviceUuid(): string {
  return crypto.randomUUID();
}
