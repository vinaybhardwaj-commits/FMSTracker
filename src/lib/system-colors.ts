/**
 * src/lib/system-colors.ts — 12-system color palette + label rules.
 *
 * Per V's lock: full word on first introduction, short code on repetition + nav.
 */

export interface SystemMeta {
  /** Display label for first-introduction places (S02 card, S03 title block). */
  full: string;
  /** Short code for navigation, badges, repetition. */
  short: string;
  /** Tailwind hex for the 4px color stripe + badge tint. */
  hex: string;
  /** Tailwind background-50 tint for badge background (10% saturation). */
  tintClass: string;
  /** Text color over the tint. */
  textClass: string;
}

const PALETTE: Record<string, SystemMeta> = {
  "Fire Safety":      { full: "Fire Safety",     short: "FIRE",     hex: "#DC2626", tintClass: "bg-red-50",     textClass: "text-red-800" },
  "MGPS":             { full: "MGPS",            short: "MGPS",     hex: "#0EA5E9", tintClass: "bg-sky-50",     textClass: "text-sky-800" },
  "Electrical":       { full: "Electrical",      short: "ELEC",     hex: "#EAB308", tintClass: "bg-yellow-50",  textClass: "text-yellow-800" },
  "Water":            { full: "Water",           short: "WATER",    hex: "#3B82F6", tintClass: "bg-blue-50",    textClass: "text-blue-800" },
  "HVAC":             { full: "HVAC",            short: "HVAC",     hex: "#06B6D4", tintClass: "bg-cyan-50",    textClass: "text-cyan-800" },
  "Lifts":            { full: "Lifts",           short: "LIFT",     hex: "#64748B", tintClass: "bg-slate-100",  textClass: "text-slate-800" },
  "Plumbing":         { full: "Plumbing",        short: "PLUMB",    hex: "#6366F1", tintClass: "bg-indigo-50",  textClass: "text-indigo-800" },
  "Building":         { full: "Building",        short: "BLDG",     hex: "#78716C", tintClass: "bg-stone-100",  textClass: "text-stone-800" },
  "Signage":          { full: "Signage",         short: "SIGN",     hex: "#16A34A", tintClass: "bg-green-50",   textClass: "text-green-800" },
  "Security":         { full: "Security",        short: "SEC",      hex: "#9333EA", tintClass: "bg-purple-50",  textClass: "text-purple-800" },
  "Hazmat":           { full: "Hazmat / BMW",    short: "HAZMAT",   hex: "#EA580C", tintClass: "bg-orange-50",  textClass: "text-orange-800" },
  "Pest Control":     { full: "Pest Control",    short: "PEST",     hex: "#84CC16", tintClass: "bg-lime-50",    textClass: "text-lime-800" },
  // Catch-alls used in seed data
  "Patient Safety":   { full: "Patient Safety",  short: "PT.SAFE",  hex: "#DB2777", tintClass: "bg-pink-50",    textClass: "text-pink-800" },
  "Facility Rounds":  { full: "Facility Rounds", short: "ROUNDS",   hex: "#0F766E", tintClass: "bg-teal-50",    textClass: "text-teal-800" },
};

const FALLBACK: SystemMeta = {
  full: "Other", short: "OTHER", hex: "#475569",
  tintClass: "bg-slate-50", textClass: "text-slate-700",
};

export function systemMeta(system: string): SystemMeta {
  return PALETTE[system] ?? { ...FALLBACK, full: system, short: system.toUpperCase().slice(0, 6) };
}
