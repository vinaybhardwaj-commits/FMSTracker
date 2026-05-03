/**
 * src/app/admin/tasks/new/page.tsx — S12 Task create.
 */

import { sql } from "@/lib/db";
import type { Vendor } from "@/lib/types";
import { TaskEditForm } from "../_edit-form";

export const dynamic = "force-dynamic";

async function loadVendors(): Promise<Vendor[]> {
  const { rows } = await sql`
    SELECT id, vendor_id, system, vendor_name, contact_name, phone, email,
           visit_cadence, scope_notes, active
    FROM vendors WHERE active = TRUE ORDER BY system, vendor_name
  `;
  return rows as Vendor[];
}

export default async function NewTaskPage() {
  const vendors = await loadVendors();
  return (
    <main className="px-6 py-6">
      <TaskEditForm initial={null} vendors={vendors} />
    </main>
  );
}
