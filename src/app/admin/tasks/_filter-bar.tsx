/**
 * src/app/admin/tasks/_filter-bar.tsx — Client island for S11 filters.
 *
 * Reads/writes URLSearchParams; pushes router on submit.
 */

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface Props {
  initial: Record<string, string | undefined>;
  systems: string[];
  cadences: readonly string[];
  actorTypes: readonly string[];
  draftStatuses: readonly string[];
}

export function TasksFilterBar({
  initial,
  systems,
  cadences,
  actorTypes,
  draftStatuses,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(initial.q ?? "");

  useEffect(() => {
    setQ(initial.q ?? "");
  }, [initial.q]);

  function commit(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`${pathname}?${sp.toString()}` as any);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit({ q });
        }}
        className="flex items-center gap-2"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search task ID, name, system…"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ehrc-blue focus:outline-none"
        />
      </form>
      <Select
        label="System"
        value={initial.system ?? ""}
        options={systems}
        onChange={(v) => commit({ system: v })}
      />
      <Select
        label="Cadence"
        value={initial.cadence ?? ""}
        options={cadences}
        onChange={(v) => commit({ cadence: v })}
      />
      <Select
        label="Actor"
        value={initial.actor_type ?? ""}
        options={actorTypes}
        onChange={(v) => commit({ actor_type: v })}
      />
      <Select
        label="Draft"
        value={initial.draft_status ?? ""}
        options={draftStatuses}
        onChange={(v) => commit({ draft_status: v })}
      />
      <Select
        label="Active"
        value={initial.active ?? ""}
        options={["active", "inactive"]}
        onChange={(v) => commit({ active: v })}
      />
      {Object.values(initial).some(Boolean) && (
        <button
          onClick={() => router.push(pathname as any)}
          className="text-xs text-slate-500 underline hover:text-ehrc-navy"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
