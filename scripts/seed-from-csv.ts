/**
 * scripts/seed-from-csv.ts — Idempotent seed loader.
 *
 * Reads the four CSVs in _spec/ and upserts them into:
 *   - vendors           (by vendor_id)        ← must run before task_templates (FK)
 *   - locations         (by asset_id)
 *   - task_templates    (by task_id, sets amc_vendor_id from vendor lookup)
 *   - statutory_items   (by licence_id)
 *
 * "TBD" string values for numeric columns become NULL.
 *
 * Usage:  pnpm seed
 */

import { createClient } from "@vercel/postgres";
import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Row = Record<string, string>;

function readCsv(name: string): Row[] {
  const content = readFileSync(join(process.cwd(), "_spec", name), "utf8");
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

function intOrNull(v: string | undefined): number | null {
  if (!v || v.trim() === "" || v.trim().toUpperCase() === "TBD") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function strOrNull(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  if (t === "" || t.toUpperCase() === "TBD") return null;
  return t;
}

function normalizeCriticality(v: string | undefined): string | null {
  const s = strOrNull(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (["critical", "high", "medium", "low"].includes(lower)) return lower;
  return null;
}

async function main() {
  const url =
    process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "POSTGRES_URL_NON_POOLING (or POSTGRES_URL) is not set. Run `vercel env pull .env.local` first."
    );
  }

  const client = createClient({ connectionString: url });
  await client.connect();

  try {
    // 1. Vendors first (task_templates FKs to vendors)
    const vendors = readCsv("seed_vendors.csv");
    let vCount = 0;
    for (const v of vendors) {
      await client.query(
        `INSERT INTO vendors (vendor_id, system, vendor_name, contact_name, phone, email, visit_cadence, scope_notes, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         ON CONFLICT (vendor_id) DO UPDATE SET
           system = EXCLUDED.system,
           vendor_name = EXCLUDED.vendor_name,
           contact_name = EXCLUDED.contact_name,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           visit_cadence = EXCLUDED.visit_cadence,
           scope_notes = EXCLUDED.scope_notes`,
        [
          strOrNull(v.vendor_id),
          v.system,
          v.vendor_name,
          strOrNull(v.contact_name),
          strOrNull(v.phone),
          strOrNull(v.email),
          strOrNull(v.visit_cadence),
          strOrNull(v.scope_notes),
        ]
      );
      vCount++;
    }
    console.log(`✓ vendors: ${vCount} upserted`);

    // 2. Locations
    const locations = readCsv("seed_locations.csv");
    let lCount = 0;
    for (const l of locations) {
      await client.query(
        `INSERT INTO locations (asset_id, system, name, floor, sub_location, count, criticality, notes, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         ON CONFLICT (asset_id) DO UPDATE SET
           system = EXCLUDED.system,
           name = EXCLUDED.name,
           floor = EXCLUDED.floor,
           sub_location = EXCLUDED.sub_location,
           count = EXCLUDED.count,
           criticality = EXCLUDED.criticality,
           notes = EXCLUDED.notes`,
        [
          strOrNull(l.asset_id),
          l.system,
          l.name,
          strOrNull(l.floor),
          strOrNull(l.sub_location),
          intOrNull(l.count),
          normalizeCriticality(l.criticality),
          strOrNull(l.notes),
        ]
      );
      lCount++;
    }
    console.log(`✓ locations: ${lCount} upserted`);

    // 3. Build vendor_name → id lookup for task_templates.amc_vendor_id resolution
    const { rows: vendorRows } = await client.sql`SELECT id, vendor_name FROM vendors`;
    const vendorByName = new Map<string, number>();
    for (const r of vendorRows) {
      vendorByName.set((r.vendor_name as string).trim().toLowerCase(), r.id as number);
    }

    // 4. Task templates
    const tasks = readCsv("seed_tasks.csv");
    let tCount = 0;
    for (const t of tasks) {
      const amcVendorName = strOrNull(t.amc_vendor);
      const amcVendorId = amcVendorName
        ? vendorByName.get(amcVendorName.toLowerCase()) ?? null
        : null;

      await client.query(
        `INSERT INTO task_templates (
           task_id, system, subsystem, location_or_asset, task_name,
           cadence, frequency_in_days, cadence_anchor,
           actor_type, amc_vendor_id, acceptance_criteria, evidence_required,
           reference_policy, nabh_standard_ref, priority_weight, draft_status, notes, active
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8,
           $9, $10, $11, $12,
           $13, $14, $15, $16, $17, TRUE
         )
         ON CONFLICT (task_id) DO UPDATE SET
           system = EXCLUDED.system,
           subsystem = EXCLUDED.subsystem,
           location_or_asset = EXCLUDED.location_or_asset,
           task_name = EXCLUDED.task_name,
           cadence = EXCLUDED.cadence,
           frequency_in_days = EXCLUDED.frequency_in_days,
           cadence_anchor = EXCLUDED.cadence_anchor,
           actor_type = EXCLUDED.actor_type,
           amc_vendor_id = EXCLUDED.amc_vendor_id,
           acceptance_criteria = EXCLUDED.acceptance_criteria,
           evidence_required = EXCLUDED.evidence_required,
           reference_policy = EXCLUDED.reference_policy,
           nabh_standard_ref = EXCLUDED.nabh_standard_ref,
           priority_weight = EXCLUDED.priority_weight,
           draft_status = EXCLUDED.draft_status,
           notes = EXCLUDED.notes`,
        [
          strOrNull(t.task_id),
          t.system,
          strOrNull(t.subsystem),
          strOrNull(t.location_or_asset),
          t.task_name,
          t.cadence,
          intOrNull(t.frequency_in_days) ?? 1,
          strOrNull(t.cadence_anchor),
          t.actor_type,
          amcVendorId,
          t.acceptance_criteria,
          t.evidence_required,
          strOrNull(t.reference_policy),
          strOrNull(t.nabh_standard_ref),
          intOrNull(t.priority_weight) ?? 50,
          strOrNull(t.draft_status) ?? "proposed",
          strOrNull(t.notes),
        ]
      );
      tCount++;
    }
    console.log(`✓ task_templates: ${tCount} upserted`);

    // 5. Statutory items
    const statutory = readCsv("seed_statutory.csv");
    let sCount = 0;
    for (const s of statutory) {
      // current_expiry: "TBD" or empty → null; otherwise expect ISO date
      let expiry: string | null = null;
      const raw = strOrNull(s.current_expiry);
      if (raw) {
        // try to parse common date formats; fall through to null on failure
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
          expiry = d.toISOString().slice(0, 10);
        }
      }

      await client.query(
        `INSERT INTO statutory_items (licence_id, item, authority, current_expiry, source_doc, notes, active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         ON CONFLICT (licence_id) DO UPDATE SET
           item = EXCLUDED.item,
           authority = EXCLUDED.authority,
           current_expiry = EXCLUDED.current_expiry,
           source_doc = EXCLUDED.source_doc,
           notes = EXCLUDED.notes`,
        [
          strOrNull(s.licence_id),
          s.item,
          strOrNull(s.authority),
          expiry,
          strOrNull(s.source_doc),
          strOrNull(s.notes),
        ]
      );
      sCount++;
    }
    console.log(`✓ statutory_items: ${sCount} upserted`);

    console.log("\nSeed complete.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
