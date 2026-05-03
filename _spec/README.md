# `_spec/` — FMSTracker source-of-truth seed data

Generated from `FMSTracker_Master_Task_Register_v1.xlsx` (V's hand-built spec).

| File | Rows | Source sheet |
|---|---|---|
| `seed_tasks.csv` | 119 | Tasks |
| `seed_locations.csv` | 46 | Locations_Assets |
| `seed_vendors.csv` | 25 | AMC_Vendors |
| `seed_statutory.csv` | 12 | Statutory_Calendar |

These CSVs are loaded by `scripts/seed-from-csv.ts` into `task_templates`, `locations`, `vendors`, `statutory_items` respectively.

Schema mapping is 1:1 with PRD §5 — see `seed-from-csv.ts` for column→column mapping including type coercions (e.g., `count: "TBD"` → null, `frequency_in_days` → integer).

After Charan's walkthrough, V will hand-edit the .xlsx, regenerate the CSVs, and re-import via the admin `/admin/import-export` UI (Phase 4) or by re-running `pnpm seed` (which is idempotent — upserts by stable id).
