#!/usr/bin/env tsx
/**
 * Marks the baseline migration as already-applied on a database that predates
 * Prisma, so `prisma migrate deploy` can go on to apply the real migrations.
 *
 * The identity database was built by the FastAPI service's `ensure_*` functions,
 * not by a migration. `prisma/migrations/00000000000000_baseline` *describes*
 * that schema — it was generated from it — so running it against the live
 * database fails on its first statement:
 *
 *     Applying migration `00000000000000_baseline`
 *     Error: P3018   ERROR: relation "addresses" already exists
 *
 * `prisma migrate resolve --applied` is the sanctioned fix, but it is a
 * per-environment one-off that nothing was doing. That is fine right up until a
 * deploy runs `migrate deploy` for the first time — which is exactly what
 * happened when the Express service reached main.
 *
 * Idempotent, and safe to run before every deploy. The decision itself lives in
 * `src/db/baseline.ts` and is unit-tested there: no Postgres is reachable from
 * a dev container, and the wrong answer either fails every deploy or silently
 * skips real tables. This file is only the I/O around it.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

// `pg` is CommonJS and has no named ESM export; the default import is the
// module object.
import pg from 'pg'

import { decideBaselineAction } from '../src/db/baseline'

const BASELINE = '00000000000000_baseline'

/**
 * Tables the baseline creates, sampled across the schema.
 *
 * All present means a pre-Prisma database; none present means an empty one.
 * A mix is the state this refuses to act on.
 */
const SAMPLE_TABLES = [
  'users',
  'organizations',
  'memberships',
  'apps',
  'addresses',
  'features',
] as const

function prismaResolve(flag: '--applied' | '--rolled-back'): void {
  // Resolved through Node rather than PATH, so this works however it is invoked.
  const cli = createRequire(import.meta.url).resolve('prisma/build/index.js')
  const result = spawnSync(
    process.execPath,
    [cli, 'migrate', 'resolve', flag, BASELINE],
    { stdio: 'inherit', env: process.env }
  )

  if (result.status !== 0) {
    throw new Error(`prisma migrate resolve ${flag} ${BASELINE} failed`)
  }
}

async function readDatabaseState(databaseUrl: string) {
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const present = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [[...SAMPLE_TABLES]]
    )

    const migrationsTable = await client.query(
      `SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'`
    )

    if (migrationsTable.rows.length === 0) {
      return {
        presentTables: present.rows.map((row) => row.table_name),
        baselineRow: null,
      }
    }

    const baseline = await client.query<{
      finished_at: Date | null
      rolled_back_at: Date | null
    }>(
      `SELECT finished_at, rolled_back_at FROM _prisma_migrations
        WHERE migration_name = $1`,
      [BASELINE]
    )
    const row = baseline.rows[0]

    return {
      presentTables: present.rows.map((entry) => entry.table_name),
      baselineRow: row
        ? { finishedAt: row.finished_at, rolledBackAt: row.rolled_back_at }
        : null,
    }
  } finally {
    await client.end()
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const { presentTables, baselineRow } = await readDatabaseState(databaseUrl)
  const decision = decideBaselineAction({
    presentTables,
    sampleTables: SAMPLE_TABLES,
    baselineRow,
  })

  if (decision.action === 'skip') {
    console.log(
      decision.reason === 'already-applied'
        ? 'Baseline already applied — nothing to do.'
        : 'Empty database — leaving the baseline for `migrate deploy` to apply.'
    )
    return
  }

  if (decision.action === 'refuse') {
    console.error(
      'Refusing to baseline a partially-built schema.\n' +
        `  missing: ${decision.missing.join(', ')}\n` +
        'Marking the baseline applied would permanently skip those tables, and\n' +
        'applying it would fail on the ones that exist. Resolve by hand.'
    )
    process.exit(1)
  }

  if (decision.clearFailedRecord) {
    console.log('Clearing the failed baseline record from a previous attempt.')
    prismaResolve('--rolled-back')
  }

  console.log(
    'Pre-Prisma database detected — marking the baseline as applied, since the ' +
      'schema it describes already exists.'
  )
  prismaResolve('--applied')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
