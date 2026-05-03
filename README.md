# FMSTracker

Mobile-first PWA for EHRC's hospital facilities maintenance crew.

Encodes the EHRC FMS Library — every preventive-maintenance task across fire, MGPS, electrical, water, HVAC, lifts, plumbing, building, signage, security, hazmat/BMW, pest, and statutory compliance — into a daily/weekly/monthly/quarterly/annual cadence the crew can claim, complete, and prove with selfies + photos.

**Status:** Phase 1 scaffolding in progress.

See `_spec/FMSTracker_PRD_v1.md`, `_spec/FMSTracker_Screen_Catalog_v1.md`, and `_spec/FMSTracker_Master_Task_Register_v1.xlsx` (sibling repo `EHRC-Daily-Dash` while specs are being moved here) for full product spec.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Vercel Postgres (`@vercel/postgres`) + Vercel Blob (`@vercel/blob`)
- bcryptjs for the single shared admin PIN
- Vercel Cron for instance generation + claim cleanup

## Local development

```bash
pnpm install
vercel link            # link to fmstracker project
vercel env pull .env.local
pnpm migrate           # apply SQL migrations (Phase 1)
pnpm seed              # load 119 templates + 47 locations + 25 vendors + 12 statutory items (Phase 1)
pnpm dev               # http://localhost:3000
```

## Phase plan

1. **Foundation** (this phase): scaffold + schema + seed + PIN gate + admin Tasks CRUD.
2. Engine + worker UI (today / claim / detail).
3. Selfie + photo capture + Vercel Blob.
4. Statutory tier engine + dashboard + audit log writes.
5. Charan walkthrough refinement → production.

See `_spec/FMSTracker_PRD_v1.md` §13 for detail.
