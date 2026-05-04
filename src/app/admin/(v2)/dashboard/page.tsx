/**
 * src/app/admin/(v2)/dashboard/page.tsx — AD1.1
 *
 * Server component: gates on PIN session (middleware also gates, this is
 * belt-suspenders), then renders <DashboardClient> which polls its own data.
 *
 * If a `?soon=<module>&sprint=<id>` query is present (sidebar links to
 * not-yet-built modules route through here), shows a fallback panel above
 * the dashboard pointing to the legacy admin route.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import { DashboardClient } from "@/components/admin/dashboard/DashboardClient";

interface PageProps {
  searchParams: Promise<{ soon?: string; sprint?: string }>;
}

export const dynamic = "force-dynamic";

const LEGACY_ROUTE: Record<string, string> = {
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

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/pin?next=" + encodeURIComponent("/admin/dashboard"));
  }

  const { soon, sprint } = await searchParams;
  const futureModule = soon && sprint ? { name: soon, sprint } : null;

  return (
    <div>
      {futureModule && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900">
            {futureModule.name} module ships in {futureModule.sprint}
          </div>
          <p className="mt-1 text-sm text-amber-800">
            The desktop {futureModule.name.toLowerCase()} surface isn&apos;t built yet.
            For now, use the existing admin route below.
          </p>
          {LEGACY_ROUTE[futureModule.name] && (
            <Link
              href={LEGACY_ROUTE[futureModule.name] as any}
              className="mt-3 inline-block rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Open legacy {futureModule.name.toLowerCase()} →
            </Link>
          )}
        </div>
      )}

      <DashboardClient />
    </div>
  );
}
