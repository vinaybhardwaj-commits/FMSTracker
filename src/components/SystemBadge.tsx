/**
 * src/components/SystemBadge.tsx — system color chip.
 */

import { systemMeta } from "@/lib/system-colors";

interface Props {
  system: string;
  variant?: "full" | "short";
  className?: string;
}

export function SystemBadge({ system, variant = "full", className = "" }: Props) {
  const m = systemMeta(system);
  const label = variant === "short" ? m.short : m.full;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${m.tintClass} ${m.textClass} ${className}`}
    >
      {label}
    </span>
  );
}
