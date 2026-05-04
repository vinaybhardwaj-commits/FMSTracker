/**
 * src/components/WorkerShell.tsx — sticky top bar used on every worker screen.
 *
 * Layout: avatar + name | 32px progress rings | nav icons (yesterday / dashboard)
 *
 * The admin link is intentionally NOT rendered — only V + Charan know the
 * `/admin` URL and reach it by typing it directly.
 */

"use client";

import Link from "next/link";
import { ProgressRings, type RingsData } from "./ProgressRings";

interface Props {
  name: string;
  avatarUrl: string | null;
  rings: RingsData;
}

export function WorkerShell({ name, avatarUrl, rings }: Props) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-slate-200" />
      )}
      <div className="flex-1 truncate">
        <div className="text-xs text-slate-500">Hello,</div>
        <div className="-mt-0.5 truncate text-sm font-medium text-ehrc-navy">{name}</div>
      </div>
      <ProgressRings data={rings} size="md" href="/dashboard" ariaLabel="Open dashboard" />
      <nav className="flex items-center gap-1" aria-label="Worker navigation">
        <Link href={"/yesterday" as any} aria-label="Yesterday recap" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100" title="Yesterday">
          <span className="text-lg">📅</span>
        </Link>
        <Link href={"/dashboard" as any} aria-label="Dashboard" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100" title="Dashboard">
          <span className="text-lg">📊</span>
        </Link>
      </nav>
    </header>
  );
}
