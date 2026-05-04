/**
 * src/components/admin/PhoneHardBlock.tsx — AD1.0
 *
 * Renders a full-screen "Open on a laptop" message when viewport <= 768px.
 * Returns null otherwise so children render normally.
 *
 * PRD §8.6.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconLaptop } from "./icons";

const BREAKPOINT_PX = 768;

export function PhoneHardBlock({ children }: { children: React.ReactNode }) {
  const [isPhone, setIsPhone] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsPhone(window.innerWidth <= BREAKPOINT_PX);
    check();
    let raf: number | null = null;
    const debounced = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(check);
    };
    window.addEventListener("resize", debounced);
    return () => {
      window.removeEventListener("resize", debounced);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  if (isPhone === null) return null; // SSR + first paint: render nothing to avoid flash
  if (!isPhone) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-ehrc-navy">
        <IconLaptop className="h-8 w-8" />
      </div>
      <div className="text-2xl font-bold text-ehrc-navy">FMSTracker Admin</div>
      <div className="text-base text-slate-700">Open on a laptop.</div>
      <p className="text-sm text-slate-500">
        Admin tools work best on a desktop or laptop. Open this page on a larger screen.
      </p>
      <Link
        href={"/" as any}
        className="mt-2 rounded-xl bg-ehrc-blue px-5 py-3 text-base font-medium text-white hover:bg-ehrc-blue/90"
      >
        Go to worker app
      </Link>
    </main>
  );
}
