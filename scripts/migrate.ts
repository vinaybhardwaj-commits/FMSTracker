/**
 * scripts/migrate.ts — Idempotent SQL migration runner.
 *
 * Reads migrations/*.sql in lexicographic order. Tracks which have been applied
 * in a `schema_migrations` table. Each migration is run inside a transaction.
 *
 * Usage:
 *   pnpm migrate
 *
 * Reads connection URL from POSTGRES_URL_NON_POOLING (preferred — bypasses pgbouncer
 * which doesn't support transactional DDL well) or POSTGRES_URL.
 */

import { createClient } from "@vercel/postgres";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

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
    await client.sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const dir = join(process.cwd(), "migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const { rows: applied } = await client.sql`SELECT name FROM schema_migrations`;
    const appliedSet = new Set(applied.map((r) => r.name as string));

    let ranAny = false;
    for (const file of files) {
      const name = basename(file);
      if (appliedSet.has(name)) {
        console.log(`= ${name} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(dir, file), "utf8");
      console.log(`+ ${name} ...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1)",
          [name]
        );
        await client.query("COMMIT");
        console.log(`  ✓ ${name}`);
        ranAny = true;
      } catch (e) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${name} failed: ${(e as Error).message}`);
      }
    }

    if (!ranAny) console.log("All migrations already applied.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
