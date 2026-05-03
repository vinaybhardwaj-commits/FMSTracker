/**
 * src/components/ProgressRings.tsx — concentric progress rings.
 *
 * Three rings (outer = month, middle = week, inner = today). Single-hue blue
 * with saturation darkening inward. EHRC brand inner. Greyed dashed when no
 * tasks scheduled in window (data === null).
 *
 * Pure SVG, no JS. CSS-only fill animation via stroke-dasharray.
 */

import Link from "next/link";

export type RingSize = "sm" | "md" | "lg" | "hero";

export interface RingsData {
  /** 0..1, or null when no scheduled tasks in the window. */
  today: number | null;
  week: number | null;
  month: number | null;
}

interface Props {
  data: RingsData;
  size?: RingSize;
  href?: string; // optional wrap in a link to /dashboard
  ariaLabel?: string;
}

const SIZE_PX: Record<RingSize, number> = { sm: 24, md: 32, lg: 80, hero: 240 };
const STROKE_PX: Record<RingSize, number> = { sm: 3, md: 4, lg: 10, hero: 28 };

const TRACK = "#E2E8F0"; // slate-200
const RING_OUTER = "#93C5FD"; // sky-300, MONTH
const RING_MIDDLE = "#3B82F6"; // blue-500, WEEK
const RING_INNER = "#0055FF"; // ehrc-blue, TODAY
const DASH_GREY = "#CBD5E1"; // slate-300, used when window is empty

export function ProgressRings({ data, size = "md", href, ariaLabel }: Props) {
  const px = SIZE_PX[size];
  const stroke = STROKE_PX[size];
  const gap = Math.max(2, Math.floor(stroke * 0.5));

  // Three rings, decreasing radius
  const center = px / 2;
  const rOuter = (px - stroke) / 2;
  const rMiddle = rOuter - stroke - gap;
  const rInner = rMiddle - stroke - gap;

  const rings = [
    { r: rOuter, color: RING_OUTER, value: data.month, label: "Month" },
    { r: rMiddle, color: RING_MIDDLE, value: data.week, label: "Week" },
    { r: rInner, color: RING_INNER, value: data.today, label: "Today" },
  ].filter((r) => r.r > 0);

  const svg = (
    <svg
      viewBox={`0 0 ${px} ${px}`}
      width={px}
      height={px}
      role="img"
      aria-label={ariaLabel ?? "Progress rings"}
    >
      {rings.map((ring, i) => {
        const C = 2 * Math.PI * ring.r;
        const isEmpty = ring.value === null;
        const dashArray = isEmpty ? `${stroke * 0.8} ${stroke * 0.6}` : undefined;
        const filled = isEmpty ? 0 : Math.max(0, Math.min(1, ring.value!));
        return (
          <g key={i} transform={`rotate(-90 ${center} ${center})`}>
            {/* Track */}
            <circle
              cx={center}
              cy={center}
              r={ring.r}
              fill="none"
              stroke={TRACK}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
            />
            {/* Filled arc */}
            {!isEmpty && filled > 0 && (
              <circle
                cx={center}
                cy={center}
                r={ring.r}
                fill="none"
                stroke={ring.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${C * filled} ${C}`}
                style={{ transition: "stroke-dasharray 600ms ease" }}
              />
            )}
            {/* Empty-window indicator: dashed grey track only */}
            {isEmpty && (
              <circle
                cx={center}
                cy={center}
                r={ring.r}
                fill="none"
                stroke={DASH_GREY}
                strokeWidth={stroke * 0.5}
                strokeDasharray={dashArray}
                opacity={0.6}
              />
            )}
          </g>
        );
      })}
    </svg>
  );

  if (href) {
    return (
      <Link href={href as any} aria-label={ariaLabel ?? "Open dashboard"}>
        {svg}
      </Link>
    );
  }
  return svg;
}

/**
 * Server-side helper: compute the three percentages from task_instances.
 * Today = today's done / today's scheduled.
 * Week  = last 7 days rolling.
 * Month = last 30 days rolling.
 */
import { sql } from "@/lib/db";
import { todayInIST } from "@/lib/engine";

export async function fetchRingsData(): Promise<RingsData> {
  const today = todayInIST();
  // Compute three windows in one SQL round-trip
  const { rows } = await sql<{
    today_total: number;
    today_done: number;
    week_total: number;
    week_done: number;
    month_total: number;
    month_done: number;
  }>`
    SELECT
      COUNT(*) FILTER (WHERE due_date = ${today}::date)::int AS today_total,
      COUNT(*) FILTER (WHERE due_date = ${today}::date AND status = 'done')::int AS today_done,
      COUNT(*) FILTER (WHERE due_date >= (${today}::date - INTERVAL '6 days') AND due_date <= ${today}::date)::int AS week_total,
      COUNT(*) FILTER (WHERE due_date >= (${today}::date - INTERVAL '6 days') AND due_date <= ${today}::date AND status = 'done')::int AS week_done,
      COUNT(*) FILTER (WHERE due_date >= (${today}::date - INTERVAL '29 days') AND due_date <= ${today}::date)::int AS month_total,
      COUNT(*) FILTER (WHERE due_date >= (${today}::date - INTERVAL '29 days') AND due_date <= ${today}::date AND status = 'done')::int AS month_done
    FROM task_instances
  `;
  const r = rows[0];
  return {
    today: r.today_total > 0 ? r.today_done / r.today_total : null,
    week: r.week_total > 0 ? r.week_done / r.week_total : null,
    month: r.month_total > 0 ? r.month_done / r.month_total : null,
  };
}
