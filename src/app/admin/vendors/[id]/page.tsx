// src/app/admin/vendors/[id]/page.tsx
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { VendorsEditForm } from "@/components/VendorsEditForm";

export const dynamic = "force-dynamic";

export default async function EditVendor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) notFound();
  const { rows } = await sql`SELECT id, vendor_id, system, vendor_name, contact_name, phone, email, visit_cadence, scope_notes, active FROM vendors WHERE id = ${numericId}`;
  if (!rows[0]) notFound();
  return <main className="px-6 py-6"><VendorsEditForm initial={rows[0] as any} /></main>;
}
