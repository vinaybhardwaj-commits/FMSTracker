export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="text-3xl font-bold text-ehrc-navy">FMSTracker</div>
      <p className="text-base text-slate-600">
        EHRC facilities maintenance tracker
      </p>
      <p className="text-sm text-slate-500">
        Phase 1 scaffolding in progress &middot; admin Tasks CRUD coming next.
      </p>
      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Build {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}
      </div>
    </main>
  );
}
