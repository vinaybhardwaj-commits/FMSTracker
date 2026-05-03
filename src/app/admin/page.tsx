/**
 * src/app/admin/page.tsx — S10 Admin home.
 *
 * Six tiles + small recent-edit hint. PIN already verified by middleware.
 */

import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TileProps {
  href: string;
  emoji: string;
  title: string;
  meta?: string;
  disabled?: boolean;
}

function Tile({ href, emoji, title, meta, disabled }: TileProps) {
  const content = (
    <div className={`flex h-32 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 text-center ring-1 ring-slate-200 transition ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50"}`}>
      <div className="text-3xl">{emoji}</div>
      <div className="text-base font-semibold text-ehrc-navy">{title}</div>
      {meta && <div className="text-xs text-slate-500">{meta}</div>}
    </div>
  );
  return disabled ? content : <Link href={href as any}>{content}</Link>;
}

async function getCounts() {
  try {
    const [tasks, locations, vendors, statutory] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM task_templates WHERE active = TRUE`,
      sql`SELECT COUNT(*)::int AS n FROM locations WHERE active = TRUE`,
      sql`SELECT COUNT(*)::int AS n FROM vendors WHERE active = TRUE`,
      sql`SELECT COUNT(*)::int AS n FROM statutory_items WHERE active = TRUE`,
    ]);
    return {
      tasks: tasks.rows[0].n as number,
      locations: locations.rows[0].n as number,
      vendors: vendors.rows[0].n as number,
      statutory: statutory.rows[0].n as number,
      ok: true,
    };
  } catch (e) {
    console.error("admin/home counts failed:", e);
    return { tasks: 0, locations: 0, vendors: 0, statutory: 0, ok: false };
  }
}

export default async function AdminHomePage() {
  const counts = await getCounts();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-ehrc-navy">Admin</div>
          <div className="text-sm text-slate-500">FMSTracker · Charan + V</div>
        </div>
        <form action="/api/admin/pin-logout" method="post">
          <button
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-ehrc-navy hover:bg-slate-200"
            type="submit"
          >
            Lock
          </button>
        </form>
      </div>

      {!counts.ok && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Database is not reachable yet. Run <code className="font-mono">pnpm migrate &amp;&amp; pnpm seed</code> from the project root.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Tile href="/admin/tasks" emoji="📋" title="Tasks" meta={`${counts.tasks} active`} />
        <Tile href="/admin/locations" emoji="📍" title="Locations" meta={`${counts.locations}`} disabled />
        <Tile href="/admin/vendors" emoji="🤝" title="Vendors" meta={`${counts.vendors}`} disabled />
        <Tile href="/admin/statutory" emoji="📜" title="Statutory" meta={`${counts.statutory}`} disabled />
        <Tile href="/admin/audit" emoji="🗒" title="Audit log" meta="Phase 4" disabled />
        <Tile href="/admin/import-export" emoji="⇅" title="Import / Export" meta="Phase 4" disabled />
      </div>

      <div className="mt-8 text-xs text-slate-400">
        Phase 1: Tasks CRUD live. Other tiles arrive in Phase 2 / Phase 4.
      </div>
    </main>
  );
}
