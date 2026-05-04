/**
 * src/components/admin/icons.tsx — AD1.0
 *
 * Inline SVG icons for admin v2. Hand-rolled (no lucide-react dep in v1)
 * because adding deps requires a pnpm-lock update + V's local install. Small
 * Heroicons-style outlines, MIT-spirit clones.
 *
 * Each icon: 20x20 viewport, 1.5px stroke, currentColor. Pass `className` for size.
 */

interface IconProps {
  className?: string;
  ariaLabel?: string;
}

function S({ className = "h-5 w-5", ariaLabel, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <S {...p}><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="11" y="3" width="6" height="6" rx="1" /><rect x="3" y="11" width="6" height="6" rx="1" /><rect x="11" y="11" width="6" height="6" rx="1" /></S>
);
export const IconTasks = (p: IconProps) => (
  <S {...p}><rect x="4" y="3" width="12" height="14" rx="1.5" /><path d="M7 7h6M7 10h6M7 13h4" /></S>
);
export const IconSchedule = (p: IconProps) => (
  <S {...p}><rect x="3" y="4" width="14" height="13" rx="1.5" /><path d="M3 8h14M7 2v4M13 2v4" /></S>
);
export const IconLocations = (p: IconProps) => (
  <S {...p}><path d="M10 17s5-4.5 5-9a5 5 0 1 0-10 0c0 4.5 5 9 5 9z" /><circle cx="10" cy="8" r="2" /></S>
);
export const IconVendors = (p: IconProps) => (
  <S {...p}><path d="M3 8l7-4 7 4-7 4-7-4z" /><path d="M3 12l7 4 7-4M3 16l7 4 7-4" /></S>
);
export const IconStatutory = (p: IconProps) => (
  <S {...p}><path d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M12 3v3h3M7 11h6M7 14h6" /></S>
);
export const IconCrew = (p: IconProps) => (
  <S {...p}><circle cx="7" cy="7" r="3" /><circle cx="14" cy="9" r="2" /><path d="M2 17a5 5 0 0 1 10 0M12 17a3.5 3.5 0 0 1 6 0" /></S>
);
export const IconReports = (p: IconProps) => (
  <S {...p}><path d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M12 3v3h3M7 13l2-2 2 2 3-3" /></S>
);
export const IconAudit = (p: IconProps) => (
  <S {...p}><path d="M4 5h12M4 9h12M4 13h8" /><circle cx="14" cy="14" r="3" /><path d="M16.5 16.5L18 18" /></S>
);
export const IconSettings = (p: IconProps) => (
  <S {...p}><circle cx="10" cy="10" r="2.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M4.4 15.6l1.4-1.4M14.2 5.8l1.4-1.4" /></S>
);

// Top-bar icons
export const IconRefresh = (p: IconProps) => (
  <S {...p}><path d="M16 8a6 6 0 1 1-1.7-4.2L17 5M17 2v3h-3" /></S>
);
export const IconLock = (p: IconProps) => (
  <S {...p}><rect x="4" y="9" width="12" height="9" rx="1.5" /><path d="M7 9V6a3 3 0 0 1 6 0v3" /></S>
);
export const IconChevronLeft = (p: IconProps) => (
  <S {...p}><path d="M12 4l-6 6 6 6" /></S>
);
export const IconChevronRight = (p: IconProps) => (
  <S {...p}><path d="M8 4l6 6-6 6" /></S>
);
export const IconAlertTriangle = (p: IconProps) => (
  <S {...p}><path d="M10 3l8 14H2L10 3z" /><path d="M10 8v4M10 14v.5" /></S>
);
export const IconLaptop = (p: IconProps) => (
  <S {...p}><rect x="3" y="5" width="14" height="9" rx="1" /><path d="M2 17h16" /></S>
);
export const IconClock = (p: IconProps) => (
  <S {...p}><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></S>
);
