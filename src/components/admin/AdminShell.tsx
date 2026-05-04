/**
 * src/components/admin/AdminShell.tsx — AD1.0
 *
 * Composes the v2 admin chrome: phone hard-block + top header + sidebar +
 * content area + session-expiry warning toast. Wraps every page inside the
 * (v2) route group.
 *
 * Lifecycle:
 *  - On mount: purge expired form drafts (24h+) from localStorage.
 *  - Renders <PhoneHardBlock> first; if active, returns early (no chrome).
 */

"use client";

import { useEffect } from "react";
import { PhoneHardBlock } from "./PhoneHardBlock";
import { AdminTopHeader } from "./AdminTopHeader";
import { AdminSidebar } from "./AdminSidebar";
import { SessionExpiryWarning } from "./SessionExpiryWarning";
import { purgeExpiredFormDrafts } from "@/lib/use-form-draft";

export function AdminShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    purgeExpiredFormDrafts();
  }, []);

  return (
    <PhoneHardBlock>
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
    </PhoneHardBlock>
  );
}
