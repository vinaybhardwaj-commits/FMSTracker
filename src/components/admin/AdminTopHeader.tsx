/**
 * src/components/admin/AdminTopHeader.tsx — AD1.0 + AD1.1
 *
 * Sticky top header for admin v2: brand mark, breadcrumbs, "Updated Ns ago"
 * chip (AD1.1), refresh button (now actually wires up to widget pollers via
 * the dashboard refresh bus), and Lock button.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { IconRefresh, IconLock } from "./icons";
import { useDashboardRefresh } from "./dashboard/refresh-context";
import { UpdatedAgoChip } from "./dashboard/UpdatedAgoChip";

function buildCrumbs(pathname: string | null) {
  if (!pathname) return [{ label: "Admin", href: "/admin/dashboard" as const }];
  const parts = pathname.split("/").filter(Boolean);
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
  const { triggerRefreshAll, earliestFetched } = useDashboardRefresh();

  async function handleLock() {
    try {
      await fetch("/api/admin/pin-logout", { method: "POST" });
    } catch {
      // ignore — redirect anyway
    }
    if (typeof window !== "undefined") window.location.replace("/");
  }

  function handleRefresh() {
    if (earliestFetched != null) {
      triggerRefreshAll();
    } else {
      // No widgets registered (e.g., not on dashboard) — fall back to page reload
      window.location.reload();
    }
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
      <UpdatedAgoChip />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh"
          title="Refresh all widgets"
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
