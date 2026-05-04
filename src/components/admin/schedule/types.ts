export interface ScheduleInstance {
  id: number;
  template_id: number | null;
  task_name: string;
  system: string;
  location_or_asset: string | null;
  due_date: string;
  status: string;
  priority_weight: number;
  cadence: string | null;
  cadence_anchor: string | null;
}

export interface StatutoryMarker {
  id: number;
  licence_id: string | null;
  item: string;
  authority: string | null;
  current_expiry: string;
  days_until: number;
}

export type ViewMode = "day" | "week" | "month" | "quarter" | "year";

export const VIEWS: { key: ViewMode; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

export function statusColor(status: string): string {
  switch (status) {
    case "claimed": return "bg-ehrc-blue/15 text-ehrc-blue border-ehrc-blue/30";
    case "done": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "overdue": return "bg-red-100 text-red-800 border-red-200";
    case "skipped": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function systemColor(system: string): { bg: string; text: string } {
  // Stable hash → palette
  let h = 0;
  for (const ch of system) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  const palettes = [
    { bg: "bg-rose-50", text: "text-rose-700" },
    { bg: "bg-orange-50", text: "text-orange-700" },
    { bg: "bg-amber-50", text: "text-amber-700" },
    { bg: "bg-lime-50", text: "text-lime-700" },
    { bg: "bg-emerald-50", text: "text-emerald-700" },
    { bg: "bg-teal-50", text: "text-teal-700" },
    { bg: "bg-cyan-50", text: "text-cyan-700" },
    { bg: "bg-sky-50", text: "text-sky-700" },
    { bg: "bg-blue-50", text: "text-blue-700" },
    { bg: "bg-indigo-50", text: "text-indigo-700" },
    { bg: "bg-violet-50", text: "text-violet-700" },
    { bg: "bg-fuchsia-50", text: "text-fuchsia-700" },
  ];
  return palettes[Math.abs(h) % palettes.length];
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const dow = r.getDay(); // 0 = Sun
  r.setDate(r.getDate() - dow);
  return r;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}
