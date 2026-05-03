/**
 * src/components/PhotoGalleryModal.tsx — M5.
 *
 * Full-screen dark modal. Swipeable horizontal carousel + bottom thumb strip.
 * Browser native pinch-to-zoom works on mobile via touch-action. Pure CSS+JS,
 * no zoom library in v1.
 */

"use client";

import { useEffect, useState } from "react";

export interface GalleryItem {
  url: string;
  /** True if this is the helper selfie (not a work photo). */
  isSelfie?: boolean;
}

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  items: GalleryItem[];
  reading?: string | null;
  vendorDue?: string | null;
  onClose: () => void;
}

export function PhotoGalleryModal({ open, title, subtitle, items, reading, vendorDue, onClose }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(items.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length, onClose]);

  if (!open || items.length === 0) return null;
  const current = items[Math.min(index, items.length - 1)];

  // Touch swipe handling
  let startX = 0;
  let startY = 0;
  let moved = false;
  function onTouchStart(e: React.TouchEvent) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved = false;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = (e.changedTouches[0].clientX - startX);
    const dy = (e.changedTouches[0].clientY - startY);
    if (Math.abs(dy) > 100 && Math.abs(dy) > Math.abs(dx)) {
      // swipe down → close
      onClose();
      return;
    }
    if (Math.abs(dx) < 50) return;
    if (dx < 0) setIndex((i) => Math.min(items.length - 1, i + 1));
    else setIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-white">
      <header className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{title}</div>
          {subtitle && <div className="truncate text-[11px] text-slate-400">{subtitle}</div>}
        </div>
        <button onClick={onClose} aria-label="Close" className="ml-2 flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-slate-800">✕</button>
      </header>

      <div
        className="flex flex-1 items-center justify-center bg-black"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={current.url}
          alt={`Photo ${index + 1} of ${items.length}`}
          className="max-h-full max-w-full object-contain"
          style={{ touchAction: "pinch-zoom" }}
        />
      </div>

      {(reading || vendorDue) && (
        <div className="border-t border-slate-800 bg-slate-900 px-4 py-2 text-center text-[12px] text-slate-300">
          {reading && <span className="mr-3">Reading: {reading}</span>}
          {vendorDue && <span>Next service due: {vendorDue}</span>}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto border-t border-slate-800 bg-slate-900 px-4 py-3">
        {items.map((it, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md ${
              i === index ? "ring-2 ring-white" : "ring-1 ring-slate-700"
            }`}
            aria-label={it.isSelfie ? "Selfie" : `Photo ${i + 1}`}
          >
            <img src={it.url} alt="" className="h-full w-full object-cover" />
            {it.isSelfie && <span className="absolute left-0.5 top-0.5 rounded-sm bg-black/70 px-1 text-[9px]">S</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
