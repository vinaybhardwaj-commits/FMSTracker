/**
 * src/app/admin/(v2)/dashboard/page.tsx — AD1.0 placeholder.
 *
 * AD1.1 will replace this with the real operational status dashboard. For now:
 *  - Server component: gates on PIN session (redirects to /admin/pin if absent).
 *  - Renders an "AD1.1 ships the widgets" message.
 *  - If a `?soon=Tasks&sprint=AD1.2` query is present (sidebar links to
 *    not-yet-built modules route through here), shows a friendlier panel
 *    with a fallback link to the legacy admin route.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";

interface PageProps {
  searchParams: Promise<{ soon?: string; sprint?: string }>;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/pin?next=" + encodeURIComponent("/admin/dashboard"));
  }

  const { soon, sprint } = await searchParams;

  // If user clicked a sidebar link to a not-yet-built module, surface a
  // fallback panel pointing them at the legacy admin route.
  const futureModule = soon && sprint ? { name: soon, sprint } : null;
  const legacyRouteForModule: Record<string, string> = {
    Tasks: "/admin/tasks",
    Schedule: "/admin/dashboard",
    Locations: "/admin/locations",
    Vendors: "/admin/vendors",
    Statutory: "/admin/statutory",
    Crew: "/admin/dashboard",
    Reports: "/admin/dashboard",
    Audit: "/admin/audit",
    Settings: "/admin/dashboard",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Operational status will live here. Widgets ship in AD1.1.
        </p>
      </div>

      {futureModule && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900">
            {futureModule.name} module ships in {futureModule.sprint}
          </div>
          <p className="mt-1 text-sm text-amber-800">
            The desktop {futureModule.name.toLowerCase()} surface isn&apos;t built yet.
            For now, use the existing admin route below.
          </p>
          {legacyRouteForModule[futureModule.name] && (
            <Link
              href={legacyRouteForModule[futureModule.name] as any}
              className="mt-3 inline-block rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Open legacy {futureModule.name.toLowerCase()} →
            </Link>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-ehrc-navy">
          AD1.0 — Foundation shipped.
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Schema migrations applied. Auth abstraction in place. AdminShell with
          sidebar + top header + phone hard-block + draft primitives all live.
          Next sprint (AD1.1) builds out the eight dashboard widgets per PRD §6.
        </p>
        <div className="mt-4 text-xs text-slate-500">
          Session ID: <span className="font-mono">{session.sessionId}</span>
          <span className="mx-2">·</span>
          Expires:{" "}
          <span className="font-mono">
            {new Date(session.expiresAt).toLocaleTimeString()}
          </span>
          <span className="mx-2">·</span>
          Extensions used:{" "}
          <span className="font-mono">{session.extensionCount}/4</span>
        </div>
      </div>
    </div>
  );
}
