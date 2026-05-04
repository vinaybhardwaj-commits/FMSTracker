/**
 * src/components/admin/AdminShell.tsx — AD1.0 + AD1.1
 *
 * Composes the v2 admin chrome: phone hard-block + DashboardRefreshProvider
 * + top header + sidebar + content area + session-expiry warning toast.
 *
 * AD1.1 added DashboardRefreshProvider — the bus that lets the top header
 * and dashboard widgets coordinate refreshes + freshness display.
 */

"use client";

import { useEffect } from "react";
import { PhoneHardBlock } from "./PhoneHardBlock";
import { AdminTopHeader } from "./AdminTopHeader";
import { AdminSidebar } from "./AdminSidebar";
import { SessionExpiryWarning } from "./SessionExpiryWarning";
import { DashboardRefreshProvider } from "./dashboard/refresh-context";
import { purgeExpiredFormDrafts } from "@/lib/use-form-draft";

export function AdminShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    purgeExpiredFormDrafts();
  }, []);

  return (
    <PhoneHardBlock>
      <DashboardRefreshProvider>
        <div className="min-h-screen bg-slate-50">
          <AdminTopHeader />
          <div className="flex">
            <AdminSidebar />
            <main className="min-w-0 flex-1 px-6 py-6">
              <div className="mx-auto max-w-screen-2xl">{children}</div>
            </main>
          </div>
          <SessionExpiryWarning />
        </div>
      </DashboardRefreshProvider>
    </PhoneHardBlock>
  );
}
