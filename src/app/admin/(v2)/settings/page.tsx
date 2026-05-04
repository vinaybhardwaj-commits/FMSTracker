/**
 * src/app/admin/(v2)/settings/page.tsx — AD1.7
 *
 * 5-tab settings page: Access · System · Notifications · Integrations · About.
 * PIN change deferred to v1.x (would need API to update FMS_ADMIN_PIN_HASH
 * which lives in Vercel env vars — out of scope for v1).
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "access", label: "Access" },
  { key: "system", label: "System" },
  { key: "notifications", label: "Notifications" },
  { key: "integrations", label: "Integrations" },
  { key: "about", label: "About" },
];

async function loadAccessStats() {
  try {
    const { rows: pinFails } = await sql`
      SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI') AS at, diff
      FROM audit_log WHERE action = 'pin_failure'
      ORDER BY created_at DESC LIMIT 30
    `;
    const { rows: extensions } = await sql`
      SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI') AS at, diff
      FROM audit_log WHERE action = 'update' AND table_name = 'admin_pin'
      ORDER BY created_at DESC LIMIT 20
    `;
    return { pinFails, extensions };
  } catch {
    return { pinFails: [], extensions: [] };
  }
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/settings"));
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab)?.key ?? "access";
  const access = active === "access" ? await loadAccessStats() : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">System configuration, access logs, integrations.</p>
      </div>
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6 text-sm font-medium" aria-label="Settings tabs">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "access" ? "/admin/settings" : `/admin/settings?tab=${t.key}`}
              className={`border-b-2 px-1 pb-2 ${active === t.key ? "border-ehrc-blue text-ehrc-navy" : "border-transparent text-slate-500 hover:text-ehrc-navy"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {active === "access" && access && <AccessTab pinFails={access.pinFails} extensions={access.extensions} />}
      {active === "system" && <SystemTab />}
      {active === "notifications" && <PlaceholderTab title="Email + Slack alerts" sprint="v1.1" desc="Out-of-band alerts when statutory items hit 7-day expiry, when long-overdue task instances accumulate, or when a PIN is locked out. Lands in v1.1 once the alert transport is wired." />}
      {active === "integrations" && <PlaceholderTab title="BAS / iBMS bridge" sprint="v2.x" desc="Building automation system integration — sensor states feed into FMSTracker so certain tasks auto-complete. Requires the EHRC BAS deployment to be online first." />}
      {active === "about" && <AboutTab session={session} />}
    </div>
  );
}

interface AuditLite { at: string; diff: Record<string, unknown> | null; }
function AccessTab({ pinFails, extensions }: { pinFails: AuditLite[]; extensions: AuditLite[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-ehrc-navy">PIN management</div>
        <p className="mt-1 text-sm text-slate-600">
          PIN is stored as a bcrypt hash in <code className="font-mono text-xs bg-slate-100 px-1">FMS_ADMIN_PIN_HASH</code> (Vercel env var). Changing it requires updating the env var in Vercel directly + redeploying.
        </p>
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <span className="font-medium text-ehrc-navy">In-app PIN change</span> ships in v1.x — it'll generate a new bcrypt hash and store it in a database table instead of an env var, so changes don't require a redeploy.
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-ehrc-navy">Recent PIN failures (last 30)</div>
        {pinFails.length === 0 ? (
          <div className="py-3 text-center text-xs text-slate-500">No PIN failures recorded.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="px-3 py-1.5 font-normal">When</th><th className="px-3 py-1.5 font-normal">IP</th><th className="px-3 py-1.5 font-normal">Remaining</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {pinFails.map((p, i) => (
                <tr key={i} className="text-sm">
                  <td className="px-3 py-1.5 text-slate-600">{p.at}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-slate-500">{(p.diff?.ip as string) ?? "—"}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-slate-500">{(p.diff?.remaining as number) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-ehrc-navy">Recent session extensions (last 20)</div>
        {extensions.length === 0 ? (
          <div className="py-3 text-center text-xs text-slate-500">No session extensions recorded.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {extensions.map((e, i) => (
              <li key={i} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-slate-600">{e.at}</span>
                <span className="text-xs text-slate-500">{(e.diff?.kind as string) ?? "extension"} · count {(e.diff?.extension_count as number) ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SystemTab() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-ehrc-navy">System</div>
      <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Kv k="Display name" v="FMSTracker" />
        <Kv k="Brand" v="EHRC" />
        <Kv k="Theme" v="Navy + Blue (locked v1)" />
        <Kv k="Timezone" v="Asia/Kolkata (locked v1)" />
        <Kv k="Locale" v="en-IN" />
        <Kv k="Engine cron" v="04:00 IST daily" />
        <Kv k="Claim TTL" v="2 hours" />
        <Kv k="Admin session TTL" v="30 minutes" />
        <Kv k="Admin extension cap" v="4 (= +2h cumulative)" />
      </dl>
    </div>
  );
}

function PlaceholderTab({ title, sprint, desc }: { title: string; sprint: string; desc: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
      <div className="text-base font-semibold text-amber-900">{title}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-amber-700">Ships in {sprint}</div>
      <p className="mx-auto mt-3 max-w-lg text-sm text-amber-800">{desc}</p>
    </div>
  );
}

function AboutTab({ session }: { session: { role: string; sessionId: string; expiresAt: number; extensionCount: number } }) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown";
  const ref = process.env.VERCEL_GIT_COMMIT_REF ?? "main";
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const url = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "—";
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-ehrc-navy">FMSTracker · Admin v2</div>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Kv k="Environment" v={env} />
          <Kv k="Deploy URL" v={url} />
          <Kv k="Git ref" v={ref} />
          <Kv k="Git SHA" v={sha.slice(0, 7)} />
          <Kv k="Build" v="Next.js 15.5 · React 19 · Neon Postgres · Vercel Pro" />
          <Kv k="Auth" v={`Single-PIN · session ${session.role}`} />
        </dl>
        <div className="mt-3 flex gap-3">
          <a href="https://github.com/vinaybhardwaj-commits/FMSTracker" target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">GitHub →</a>
          <a href="https://vercel.com/vinaybhardwaj-commits-projects/fmstracker" target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Vercel →</a>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-ehrc-navy">Sprints shipped</div>
        <ul className="space-y-1 text-sm">
          <li>✓ AD1.0 — Schema + AdminShell + auth abstraction + draft primitives</li>
          <li>✓ AD1.1 — Operational status dashboard with 7 widgets</li>
          <li>✓ AD1.2 — Tasks module + DataTable primitive + force-propagate</li>
          <li>✓ AD1.3 — Schedule (5 views: Day/Week/Month/Quarter/Year)</li>
          <li>✓ AD1.4 — Locations + Vendors + Statutory CRUD</li>
          <li>✓ AD1.5 — Crew & Devices</li>
          <li>✓ AD1.6 — Reports (6 types, print-styled HTML PDFs + signed CSVs)</li>
          <li>✓ AD1.7 — Audit advanced filters + Settings + Imports tab</li>
          <li className="text-slate-400">⏳ AD1.8 — UAT + ship tag <code className="font-mono">admin-v2-shipped</code></li>
        </ul>
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className="mt-0.5 font-mono text-xs text-ehrc-navy">{v}</dd>
    </div>
  );
}
