/**
 * src/components/admin/AdminTopHeader.tsx — AD1.0
 *
 * Sticky top header for admin v2: brand mark, breadcrumbs, refresh, lock.
 *
 * AD1.0 placeholders:
 * - Refresh button: visible but no-op (wires up to widget pollers in AD1.1)
 * - Search input: not yet shown (deferred to AD1.7)
 * - "Updated Ns ago" chip: not yet shown (depends on widget polling state in AD1.1)
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { IconRefresh, IconLock } from "./icons";

function buildCrumbs(pathname: string | null) {
  if (!pathname) return [{ label: "Admin", href: "/admin/dashboard" as const }];
  const parts = pathname.split("/").filter(Boolean); // ['admin','dashboard',...]
  const crumbs: { label: string; href: string }[] = [
    { label: "Admin", href: "/admin/dashboard" },
  ];
  let cum = "";
  for (let i = 1; i < parts.length; i++) {
    cum += "/" + parts[i];
    const label = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
    crumbs.push({ label, href: "/admin" + cum });
  }
  return crumbs;
}

export function AdminTopHeader() {
  const pathname = usePathname();
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);

  async function handleLock() {
    try {
      await fetch("/api/admin/pin-logout", { method: "POST" });
    } catch {
      // ignore — redirect anyway
    }
    if (typeof window !== "undefined") window.location.replace("/");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2 text-base font-bold text-ehrc-navy">
        FMSTracker
      </div>
      <nav aria-label="Breadcrumb" className="flex-1 truncate text-sm text-slate-500">
        {crumbs.map((c, i) => (
          <span key={c.href}>
            {i > 0 && <span className="mx-1.5 text-slate-300">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-ehrc-navy">{c.label}</span>
            ) : (
              <Link href={c.href as any} className="hover:text-ehrc-navy">
                {c.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => window.location.reload()}
          aria-label="Refresh"
          title="Refresh"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <IconRefresh className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleLock}
          aria-label="Lock admin"
          title="Lock"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          <IconLock className="h-4 w-4" />
          <span>Lock</span>
        </button>
      </div>
    </header>
  );
}
