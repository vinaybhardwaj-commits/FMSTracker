/**
 * src/app/admin/statutory/[id]/page.tsx — S18 edit page.
 */

import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { StatutoryEditForm } from "@/components/StatutoryEditForm";

export const dynamic = "force-dynamic";

export default async function EditStatutory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) notFound();
  const { rows } = await sql`
    SELECT id, licence_id, item, authority, current_expiry::text AS current_expiry,
           source_doc, notes, active
    FROM statutory_items WHERE id = ${numericId}
  `;
  if (!rows[0]) notFound();
  return (
    <main className="px-6 py-6">
      <StatutoryEditForm initial={rows[0] as any} />
    </main>
  );
}
