// src/app/admin/locations/[id]/page.tsx
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { LocationsEditForm } from "@/components/LocationsEditForm";

export const dynamic = "force-dynamic";

export default async function EditLocation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) notFound();
  const { rows } = await sql`SELECT id, asset_id, system, name, floor, sub_location, count, criticality, notes, active FROM locations WHERE id = ${numericId}`;
  if (!rows[0]) notFound();
  return <main className="px-6 py-6"><LocationsEditForm initial={rows[0] as any} /></main>;
}
