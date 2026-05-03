/**
 * src/components/TaskDetailPage.tsx — S03.
 *
 * Fetches /api/instance/[id], renders title + criteria + vendor (if any)
 * + done-state proof (if any). Fixed-bottom CTA bar with three states
 * (Free/Mine/Other). Skip + Release modals (M1/M2).
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkerShell } from "./WorkerShell";
import { SystemBadge } from "./SystemBadge";
import { SkipReasonModal } from "./SkipReasonModal";
import { ReleaseClaimModal } from "./ReleaseClaimModal";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { systemMeta } from "@/lib/system-colors";
import { type LocalDevice } from "@/lib/device";
import type { RingsData } from "./ProgressRings";

interface InstanceDetail {
  id: number;
  task_name: string;
  system: string;
  subsystem: string | null;
  cadence: string | null;
  location_or_asset: string | null;
  acceptance_criteria: string;
  evidence_required: string;
  reference_policy: string | null;
  nabh_standard_ref: string | null;
  priority_weight: number;
  status: string;
  claimed_by_device: string | null;
  claimed_by_name: string | null;
  claim_expires_at: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  selfie_url: string | null;
  photo_urls: string[] | null;
  reading_value: string | null;
  vendor_id: number | null;
  vendor_name: string | null;
  vendor_contact: string | null;
  vendor_phone: string | null;
  vendor_cadence: string | null;
}

function minutesUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 60_000));
}

function minutesSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TaskDetailPage({
  device,
  instanceId,
  rings,
}: {
  device: LocalDevice;
  instanceId: number;
  rings: RingsData;
}) {
  const router = useRouter();
  const [instance, setInstance] = useState<InstanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refExpanded, setRefExpanded] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch(`/api/instance/${instanceId}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { instance } = (await r.json()) as { instance: InstanceDetail };
      setInstance(instance);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  async function doClaim() {
    if (!instance || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/instance/${instance.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_uuid: device.device_uuid }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        if (r.status === 409) {
          alert("Someone else just grabbed this task. Refreshing.");
          await load();
          return;
        }
        throw new Error(d.error || `HTTP ${r.status}`);
      }
      await load();
    } catch (e) {
      alert(`Claim failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function doRelease(reason: string) {
    if (!instance) return;
    const r = await fetch(`/api/instance/${instance.id}/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_uuid: device.device_uuid, reason }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || `HTTP ${r.status}`);
    }
    setReleaseOpen(false);
    await load();
  }

  async function doSkip(reason: string, notes: string) {
    if (!instance) return;
    const r = await fetch(`/api/instance/${instance.id}/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_uuid: device.device_uuid, reason, notes }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || `HTTP ${r.status}`);
    }
    setSkipOpen(false);
    router.push("/" as any);
  }

  function startCompletion() {
    if (!instance) return;
    router.push(`/instance/${instance.id}/complete/selfie` as never);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <WorkerShell name={device.name} avatarUrl={device.baseline_selfie_url} rings={rings} />
        <div className="mx-4 mt-6 space-y-3" aria-busy>
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-32 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
        </div>
      </main>
    );
  }

  if (error || !instance) {
    return (
      <main className="min-h-screen bg-slate-50">
        <WorkerShell name={device.name} avatarUrl={device.baseline_selfie_url} rings={rings} />
        <div className="mx-4 mt-12 rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-base font-semibold text-ehrc-navy">Couldn't open this task.</div>
          {error && <div className="mt-1 text-sm text-slate-500">{error}</div>}
          <button onClick={() => router.push("/" as any)} className="mt-4 rounded-lg bg-ehrc-blue px-4 py-2 text-sm text-white">
            Back to today
          </button>
        </div>
      </main>
    );
  }

  const meta = systemMeta(instance.system);
  const isMine = instance.status === "claimed" && instance.claimed_by_device === device.device_uuid;
  const isOther = instance.status === "claimed" && !isMine;
  const isFree = instance.status === "pending" || instance.status === "overdue";
  const isDone = instance.status === "done";
  const isSkipped = instance.status === "skipped";
  const minutesLeft = minutesUntil(instance.claim_expires_at);
  const minutesHeld = minutesSince(instance.claim_expires_at ? null : null) ?? // not used
    (instance.claim_expires_at ? 30 - (minutesLeft ?? 0) : null);

  const priorityLabel =
    instance.priority_weight >= 95
      ? "CRITICAL"
      : instance.priority_weight >= 80
      ? "HIGH"
      : null;

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      <WorkerShell name={device.name} avatarUrl={device.baseline_selfie_url} rings={rings} />
      {/* Back */}
      <div className="flex h-9 items-center px-4">
        <button onClick={() => router.push("/" as any)} className="text-sm text-slate-500 hover:text-ehrc-navy">
          ◀ Back
        </button>
      </div>
      <div className="flex">
        {/* System color stripe — full height left edge */}
        <div className="w-1 shrink-0" style={{ background: meta.hex }} aria-hidden />
        <div className="flex-1 px-4">
          {/* Title block */}
          <h1 className="text-[22px] font-bold leading-tight text-ehrc-navy">{instance.task_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <SystemBadge system={instance.system} variant="short" />
            {instance.cadence && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                {instance.cadence.toUpperCase()}
              </span>
            )}
            {priorityLabel && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                {priorityLabel}
              </span>
            )}
          </div>
          {(instance.location_or_asset || instance.subsystem) && (
            <div className="mt-1 truncate text-sm text-slate-600">
              {[instance.location_or_asset, instance.subsystem].filter(Boolean).join(" · ")}
            </div>
          )}

          {/* Done-state proof */}
          {isDone && (
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="mt-4 block w-full rounded-xl border border-green-200 bg-green-50 p-3 text-left hover:bg-green-100"
            >
              <div className="text-sm font-semibold text-green-800">
                ✓ Done at {formatTime(instance.completed_at)} by {instance.completed_by_name}
              </div>
              {instance.reading_value && (
                <div className="mt-1 text-sm text-slate-700">Reading: {instance.reading_value}</div>
              )}
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {instance.selfie_url && (
                  <img src={instance.selfie_url} alt="Selfie" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                {(instance.photo_urls ?? []).slice(0, 5).map((url, i) => (
                  <img key={i} src={url} alt={`Proof ${i + 1}`} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ))}
              </div>
              <div className="mt-1 text-[11px] text-green-700">Tap to view all photos →</div>
            </button>
          )}

          {isSkipped && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              ⊘ Skipped by {instance.completed_by_name} at {formatTime(instance.completed_at)}
            </div>
          )}

          {/* Acceptance criteria */}
          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              What done looks like
            </div>
            <div className="mt-1 whitespace-pre-line text-[18px] leading-relaxed text-slate-800">
              {instance.acceptance_criteria}
            </div>
          </div>

          {/* Reference */}
          {(instance.reference_policy || instance.nabh_standard_ref) && (
            <div className="mt-6 text-[13px] text-slate-500">
              <button
                onClick={() => setRefExpanded((o) => !o)}
                className="inline-flex items-center gap-1 hover:text-ehrc-navy"
              >
                ⓘ Reference {refExpanded ? "▴" : "▾"}
              </button>
              {refExpanded && (
                <div className="mt-2 rounded-lg bg-slate-50 p-3">
                  {instance.reference_policy && <div>Policy: {instance.reference_policy}</div>}
                  {instance.nabh_standard_ref && <div>NABH: {instance.nabh_standard_ref}</div>}
                </div>
              )}
            </div>
          )}

          {/* Vendor card */}
          {instance.vendor_id && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Vendor on this task
              </div>
              <div className="mt-1 text-base font-semibold text-ehrc-navy">{instance.vendor_name}</div>
              <div className="mt-2 space-y-0.5 text-sm">
                <div className={instance.vendor_contact ? "text-slate-700" : "text-slate-400"}>
                  Contact: {instance.vendor_contact || "— (not set)"}
                </div>
                <div>
                  ☎{" "}
                  {instance.vendor_phone ? (
                    <a href={`tel:${instance.vendor_phone}`} className="text-ehrc-blue hover:underline">
                      {instance.vendor_phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">— (not set)</span>
                  )}
                </div>
                <div className={instance.vendor_cadence ? "text-slate-700" : "text-slate-400"}>
                  Visit cadence: {instance.vendor_cadence || "— (not set)"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom CTA */}
      {!isDone && !isSkipped && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pb-3 pt-3">
          {isMine && minutesLeft !== null && (
            <div className={`mb-1 text-center text-[11px] ${minutesLeft < 5 ? "text-amber-700" : "text-slate-500"}`}>
              Yours · {minutesLeft < 5 ? `${minutesLeft}:00 left` : `${minutesLeft} min left`}
            </div>
          )}
          {isOther && (
            <div className="mb-1 text-center text-[13px] text-slate-700">
              ● {instance.claimed_by_name || "Someone"} has this · {minutesLeft ?? "—"} min left
            </div>
          )}
          {isFree ? (
            <button
              onClick={doClaim}
              disabled={busy}
              className="w-full rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white disabled:opacity-50"
            >
              {busy ? "Claiming…" : "I'll do this"}
            </button>
          ) : isMine ? (
            <button
              onClick={startCompletion}
              className="w-full rounded-2xl bg-ehrc-blue py-4 text-base font-medium text-white"
            >
              Complete this
            </button>
          ) : (
            <button
              onClick={() => setReleaseOpen(true)}
              className="w-full rounded-2xl border-2 border-ehrc-navy bg-white py-4 text-base font-medium text-ehrc-navy"
            >
              Release claim
            </button>
          )}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <button onClick={() => setSkipOpen(true)} className="hover:text-ehrc-navy">
              Skip this task
            </button>
            {isMine && (
              <button onClick={() => doRelease("Cancelled own claim")} className="hover:text-ehrc-navy">
                Cancel my claim
              </button>
            )}
          </div>
        </div>
      )}

      <SkipReasonModal open={skipOpen} onClose={() => setSkipOpen(false)} onConfirm={doSkip} />
      <ReleaseClaimModal
        open={releaseOpen}
        claimerName={instance.claimed_by_name}
        minutesHeld={minutesHeld}
        onClose={() => setReleaseOpen(false)}
        onConfirm={doRelease}
      />
      <PhotoGalleryModal
        open={galleryOpen}
        title={instance.task_name}
        subtitle={`${instance.completed_by_name ?? ""} · ${formatTime(instance.completed_at)}`}
        items={[
          ...(instance.selfie_url ? [{ url: instance.selfie_url, isSelfie: true }] : []),
          ...(instance.photo_urls ?? []).map((u) => ({ url: u })),
        ]}
        reading={instance.reading_value}
        vendorDue={null}
        onClose={() => setGalleryOpen(false)}
      />
    </main>
  );
}
