/**
 * src/app/admin/(v2)/layout.tsx — AD1.0
 *
 * Route group layout. Wraps every page in /admin/(v2)/* with <AdminShell>.
 * Pages OUTSIDE this group (the legacy /admin/tasks, /admin/locations, etc.,
 * plus /admin/pin and the legacy /admin home) are NOT wrapped — they keep
 * their existing mobile-first layouts until they migrate sprint by sprint.
 */

import { AdminShell } from "@/components/admin/AdminShell";

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
