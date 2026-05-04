/**
 * src/components/admin/AdminSidebar.tsx — AD1.0
 *
 * Persistent left sidebar. 240px expanded, 56px collapsed, persistence via
 * localStorage. Sections per PRD §5.1.
 *
 * Sub-decision §6.2 default: links to not-yet-built modules render normally
 * but route to the dashboard placeholder, which itself surfaces "ships in
 * AD1.X" + a fallback link to the old admin route.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconDashboard,
  IconTasks,
  IconSchedule,
  IconLocations,
  IconVendors,
  IconStatutory,
  IconCrew,
  IconReports,
  IconAudit,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
} from "./icons";

const COLLAPSE_KEY = "fms_admin_sidebar_expanded";

interface NavItem {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Sub-sprint that delivers the real page; if non-null, link points to dashboard with a query flag. */
  shipsInSprint?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "",
    items: [{ label: "Dashboard", href: "/admin/dashboard", Icon: IconDashboard }],
  },
  {
    label: "Operations",
    items: [
      { label: "Tasks", href: "/admin/tasks", Icon: IconTasks },
      { label: "Schedule", href: "/admin/schedule", Icon: IconSchedule },
      { label: "Crew", href: "/admin/crew", Icon: IconCrew },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Locations", href: "/admin/locations", Icon: IconLocations },
      { label: "Vendors", href: "/admin/vendors", Icon: IconVendors },
      { label: "Statutory", href: "/admin/statutory", Icon: IconStatutory },
    ],
  },
  {
    label: "Oversight",
    items: [
      { label: "Reports", href: "/admin/reports", Icon: IconReports, shipsInSprint: "AD1.6" },
      { label: "Audit", href: "/admin/audit", Icon: IconAudit, shipsInSprint: "AD1.7" },
      { label: "Settings", href: "/admin/settings", Icon: IconSettings, shipsInSprint: "AD1.7" },
    ],
  },
];

export function AdminSidebar() {
  const [expanded, setExpanded] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setHydrated(true);
    try {
      const v = window.localStorage.getItem(COLLAPSE_KEY);
      if (v === "false") setExpanded(false);
    } catch {
      // ignore
    }
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const widthClass = expanded ? "w-60" : "w-14";

  return (
    <aside
      className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col ${widthClass} transition-[width] duration-150`}
      aria-label="Admin navigation"
    >
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {expanded && group.label && (
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname?.startsWith(item.href + "/");
                const isFuture = !!item.shipsInSprint;
                // For not-yet-built modules in v2, route to dashboard placeholder
                // with a hint query param. Dashboard placeholder reads it and
                // surfaces "ships in AD1.X" + a link to the old admin route.
                const href = isFuture
                  ? `/admin/dashboard?soon=${encodeURIComponent(item.label)}&sprint=${item.shipsInSprint}`
                  : item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={href as any}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-ehrc-blue/10 text-ehrc-blue"
                          : "text-ehrc-navy hover:bg-slate-50"
                      }`}
                      title={!expanded ? item.label : undefined}
                    >
                      <item.Icon className="h-5 w-5 shrink-0" />
                      {expanded && <span className="truncate">{item.label}</span>}
                      {expanded && isFuture && (
                        <span className="ml-auto rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                          {item.shipsInSprint}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-2">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <IconChevronLeft className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
          {expanded && <span>Collapse</span>}
        </button>
      </div>
      {!hydrated && null /* avoid hydration-mismatch flash */}
    </aside>
  );
}
