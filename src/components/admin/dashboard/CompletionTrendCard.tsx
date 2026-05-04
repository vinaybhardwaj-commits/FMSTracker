/**
 * src/components/admin/dashboard/CompletionTrendCard.tsx — AD1.1
 *
 * Hand-rolled SVG line chart for 14-day completion %. No Recharts dep.
 */

"use client";

import { useState } from "react";
import { useAdminPoll } from "@/lib/use-admin-poll";
import { WidgetCard } from "./WidgetCard";

interface TrendResp {
  ok: boolean;
  series: { date: string; completed: number; total: number; completion_pct: number | null }[];
}

const W = 600;
const H = 180;
const PAD_X = 28;
const PAD_Y = 16;
const TARGET = 95;

export function CompletionTrendCard() {
  const poll = useAdminPoll<TrendResp>(
    () => fetch("/api/admin/dashboard/completion-trend").then((r) => r.json()),
    60 * 60 * 1000 // hourly
  );
  return (
    <WidgetCard
      id="completion-trend"
      title="Completion trend"
      subtitle="Last 14 days · target 95%"
      span="col-span-12 lg:col-span-8"
      pollResult={poll}
      isEmpty={(d) => d.series.length === 0 || d.series.every((s) => s.total === 0)}
      emptyLabel="No tasks were due in the last 14 days."
    >
      {(d) => <Chart series={d.series} />}
    </WidgetCard>
  );
}

function Chart({ series }: { series: TrendResp["series"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;
  const yFor = (pct: number | null) =>
    pct == null ? null : PAD_Y + innerH - (pct / 100) * innerH;

  // Build polyline points (skip null gaps)
  const segments: { x: number; y: number; pct: number; date: string }[][] = [];
  let cur: { x: number; y: number; pct: number; date: string }[] = [];
  series.forEach((s, i) => {
    const x = PAD_X + i * stepX;
    const y = yFor(s.completion_pct);
    if (y == null) {
      if (cur.length > 0) {
        segments.push(cur);
        cur = [];
      }
    } else {
      cur.push({ x, y, pct: s.completion_pct as number, date: s.date });
    }
  });
  if (cur.length > 0) segments.push(cur);

  const targetY = yFor(TARGET) as number;
  const hovered = hover != null ? series[hover] : null;
  const hoveredX = hover != null ? PAD_X + hover * stepX : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Completion percentage over the last 14 days"
        onMouseLeave={() => setHover(null)}
      >
        {/* Y-axis grid */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = yFor(tick) as number;
          return (
            <g key={tick}>
              <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PAD_X - 4} y={y + 3} fontSize={9} fill="#94a3b8" textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}
        {/* Target line */}
        <line
          x1={PAD_X}
          y1={targetY}
          x2={W - PAD_X}
          y2={targetY}
          stroke="#10b981"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.6}
        />
        {/* Line segments */}
        {segments.map((seg, i) => (
          <polyline
            key={i}
            fill="none"
            stroke="#0055FF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
          />
        ))}
        {/* Points */}
        {segments.flat().map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#0055FF" />
        ))}
        {/* X-axis date labels (sparse — every 3rd) */}
        {series.map((s, i) => {
          if (i % 3 !== 0 && i !== series.length - 1) return null;
          const x = PAD_X + i * stepX;
          const label = s.date.slice(5); // MM-DD
          return (
            <text
              key={i}
              x={x}
              y={H - 2}
              fontSize={9}
              fill="#94a3b8"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}
        {/* Hover overlay */}
        {series.map((_, i) => {
          const x = PAD_X + i * stepX;
          return (
            <rect
              key={i}
              x={x - stepX / 2}
              y={0}
              width={stepX}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
        {/* Hover indicator line */}
        {hoveredX != null && (
          <line
            x1={hoveredX}
            y1={PAD_Y}
            x2={hoveredX}
            y2={H - PAD_Y}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}
      </svg>
      {hovered && (
        <div className="absolute left-3 top-2 rounded-md bg-ehrc-navy px-2 py-1 text-xs text-white shadow">
          {hovered.date}:{" "}
          {hovered.completion_pct == null
            ? "no data"
            : `${hovered.completion_pct}% (${hovered.completed}/${hovered.total})`}
        </div>
      )}
    </div>
  );
}
