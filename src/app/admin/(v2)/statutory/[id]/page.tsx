import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { StatutoryForm, type StatutoryFormValues } from "@/components/admin/statutory/StatutoryForm";
import { StatutoryDetailPanel } from "@/components/admin/statutory/StatutoryDetailPanel";

export const dynamic = "force-dynamic";

interface RenewalEntry {
  id: number;
  renewed_at: string;
  previous_expiry: string | null;
  new_expiry: string;
  certificate_url: string | null;
  notes: string | null;
}

async function load(sid: number): Promise<{ values: StatutoryFormValues; daysUntil: number | null; history: RenewalEntry[] } | null> {
  const { rows } = await sql`
    SELECT licence_id, item, authority,
      to_char(current_expiry, 'YYYY-MM-DD') AS current_expiry,
      current_certificate_url, source_doc, notes, active,
      CASE WHEN current_expiry IS NULL THEN NULL ELSE (current_expiry - CURRENT_DATE)::int END AS days_until
    FROM statutory_items WHERE id = ${sid}
  `;
  const r = rows[0]; if (!r) return null;
  const values: StatutoryFormValues = {
    licence_id: r.licence_id ?? "", item: r.item ?? "", authority: r.authority ?? "",
    current_expiry: r.current_expiry ?? "", current_certificate_url: r.current_certificate_url ?? "",
    source_doc: r.source_doc ?? "", notes: r.notes ?? "", active: r.active ?? true,
  };
  const { rows: hist } = await sql`
    SELECT id, renewed_at,
      to_char(previous_expiry, 'YYYY-MM-DD') AS previous_expiry,
      to_char(new_expiry, 'YYYY-MM-DD') AS new_expiry,
      certificate_url, notes
    FROM statutory_renewals
    WHERE statutory_id = ${sid}
    ORDER BY renewed_at DESC
  `;
  return { values, daysUntil: r.days_until ?? null, history: hist as RenewalEntry[] };
}

export default async function EditStatutoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  const { id } = await params;
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent(`/admin/statutory/${id}`));
  const sid = parseInt(id, 10);
  if (!Number.isFinite(sid)) notFound();
  const data = await load(sid);
  if (!data) notFound();
  return (
    <div>
      <div className="mb-4 text-sm"><Link href={"/admin/statutory" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">← Statutory</Link></div>
      <h1 className="mb-6 text-2xl font-bold text-ehrc-navy">{data.values.licence_id || `Statutory #${sid}`} · {data.values.item}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0"><StatutoryForm statutoryId={sid} initial={data.values} /></div>
        <div>
          <StatutoryDetailPanel
            statutoryId={sid}
            currentExpiry={data.values.current_expiry || null}
            daysUntil={data.daysUntil}
            history={data.history}
          />
        </div>
      </div>
    </div>
  );
}
