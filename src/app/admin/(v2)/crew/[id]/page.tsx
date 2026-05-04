import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { CrewSidebarPanel } from "@/components/admin/crew/CrewSidebarPanel";
import { CrewActivityTimeline } from "@/components/admin/crew/CrewActivityTimeline";

export const dynamic = "force-dynamic";

async function loadName(deviceId: string): Promise<string | null> {
  try {
    const { rows } = await sql`SELECT name FROM devices WHERE id = ${deviceId}::uuid AND is_admin = FALSE`;
    return rows[0]?.name ?? null;
  } catch {
    return null;
  }
}

export default async function CrewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  const { id } = await params;
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent(`/admin/crew/${id}`));
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const name = await loadName(id);
  if (!name) notFound();

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={"/admin/crew" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">← Crew</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-ehrc-navy">{name}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0"><CrewActivityTimeline deviceId={id} /></div>
        <div><CrewSidebarPanel deviceId={id} /></div>
      </div>
    </div>
  );
}
