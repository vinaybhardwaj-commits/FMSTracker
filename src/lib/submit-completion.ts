/**
 * src/lib/submit-completion.ts — orchestrates uploads + completion API call.
 *
 * Reads the per-instance capture state, uploads any data-URL blobs to
 * /api/upload-image (in parallel), then POSTs to /api/instance/[id]/complete
 * with the resulting public URLs. On success clears the local state.
 *
 * Partial-success: each successful upload is cached back into capture state
 * as the URL (replacing the data URL) so a retry only re-uploads what failed.
 */

import { dataUrlToBlob, getCaptureState, saveCaptureState, clearCaptureState } from "./capture-state";

interface UploadOk { url: string; pathname: string }

async function uploadOne(prefix: string, dataUrl: string): Promise<string> {
  // Already a public URL — pass through (partial-success cache).
  if (dataUrl.startsWith("https://")) return dataUrl;
  const blob = await dataUrlToBlob(dataUrl);
  const file = new File([blob], `${prefix}.jpg`, { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", file);
  form.append("prefix", prefix);
  const res = await fetch("/api/upload-image", { method: "POST", body: form });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || `upload ${prefix} failed (${res.status})`);
  }
  const { url } = (await res.json()) as UploadOk;
  return url;
}

export async function submitCompletion(instanceId: number, deviceUuid: string): Promise<void> {
  const state = getCaptureState(instanceId);
  if (!state.selfie) throw new Error("Selfie missing — go back to Selfie step.");

  // Selfie always
  let selfieUrl = state.selfie;
  if (!selfieUrl.startsWith("https://")) {
    selfieUrl = await uploadOne("selfie", selfieUrl);
    saveCaptureState(instanceId, { selfie: selfieUrl });
  }

  // Photos (parallel)
  const photoUrls: string[] = [];
  if (state.photos && state.photos.length > 0) {
    const uploaded = await Promise.all(
      state.photos.map((p) => uploadOne("photo", p))
    );
    photoUrls.push(...uploaded);
    saveCaptureState(instanceId, { photos: uploaded });
  }

  // Vendor proofs
  let vendorOnsite = state.vendor_onsite;
  let vendorReport = state.vendor_report;
  if (vendorOnsite && !vendorOnsite.startsWith("https://")) {
    vendorOnsite = await uploadOne("vendor", vendorOnsite);
    saveCaptureState(instanceId, { vendor_onsite: vendorOnsite });
  }
  if (vendorReport && !vendorReport.startsWith("https://")) {
    vendorReport = await uploadOne("vendor", vendorReport);
    saveCaptureState(instanceId, { vendor_report: vendorReport });
  }

  const body = {
    device_uuid: deviceUuid,
    selfie_url: selfieUrl,
    photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
    reading_value: state.reading_value || undefined,
    notes: state.notes || undefined,
    vendor_present_photo_url: vendorOnsite || undefined,
    vendor_report_url: vendorReport || undefined,
    vendor_next_due_date: state.vendor_due || undefined,
  };

  const res = await fetch(`/api/instance/${instanceId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || `completion failed (${res.status})`);
  }

  clearCaptureState(instanceId);
}
