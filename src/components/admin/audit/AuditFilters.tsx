"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const ACTIONS = ["create", "update", "delete", "soft_delete", "force_propagate", "statutory_renew", "pin_failure", "claim_expired"];
const TABLES = ["task_templates", "task_instances", "vendors", "locations", "statutory_items", "audit_log", "admin_pin"];

export function AuditFilters({ availableActors }: { availableActors: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") sp.delete(key);
    else sp.set(key, value);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  const actor = searchParams.get("actor") ?? "";
  const action = searchParams.get("action") ?? "";
  const table = searchParams.get("table") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const csvHref = `/api/admin/reports/csv/audit_trail?from=${from || "2000-01-01"}&to=${to || "2099-12-31"}`;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="Actor">
          <select value={actor} onChange={(e) => setParam("actor", e.target.value)} className={inp}>
            <option value="">All actors</option>
            {availableActors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Action">
          <select value={action} onChange={(e) => setParam("action", e.target.value)} className={inp}>
            <option value="">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Table">
          <select value={table} onChange={(e) => setParam("table", e.target.value)} className={inp}>
            <option value="">All tables</option>
            {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="From"><input type="date" value={from} onChange={(e) => setParam("from", e.target.value)} className={inp} /></Field>
        <Field label="To"><input type="date" value={to} onChange={(e) => setParam("to", e.target.value)} className={inp} /></Field>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => router.replace(pathname)} className="text-xs text-slate-500 hover:text-ehrc-navy hover:underline">Clear filters</button>
        <a href={csvHref} className="rounded-md bg-ehrc-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-ehrc-blue/90">Export CSV</a>
      </div>
    </div>
  );
}

const inp = "w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-ehrc-blue focus:outline-none";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      {children}
    </label>
  );
}
