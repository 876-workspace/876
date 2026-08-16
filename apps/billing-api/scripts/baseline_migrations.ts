import { spawnSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'

import pg from 'pg'

import {
  billingTableSample,
  decideLedgerRepair,
  type LedgerDecision,
  type MigrationRow,
} from '../src/db/migration-ledger.js'

const args = process.argv.slice(2).filter((argument) => argument !== '--')
const unknown = args.filter((argument) => argument !== '--dry-run')
if (unknown.length) throw new Error(`Unknown arguments: ${unknown.join(', ')}`)
const dryRun = args.includes('--dry-run')

const databaseUrl =
  process.env.BILLING_DIRECT_DATABASE_URL ?? process.env.BILLING_DATABASE_URL
if (!databaseUrl) throw new Error('A Billing database URL is required.')
process.env.BILLING_DIRECT_DATABASE_URL ??= databaseUrl

const cli = createRequire(import.meta.url).resolve('prisma/build/index.js')
const drift = spawnSync(
  process.execPath,
  [
    cli,
    'migrate',
    'diff',
    '--from-schema',
    'prisma/schema',
    '--to-config-datasource',
    '--exit-code',
  ],
  { stdio: 'inherit', env: process.env }
)
if (drift.status !== 0)
  throw new Error('Refusing to repair a database with Prisma schema drift.')

const migrationDirectory = new URL('../prisma/migrations/', import.meta.url)
const localMigrations = (
  await readdir(migrationDirectory, {
    withFileTypes: true,
  })
)
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()
let decision: LedgerDecision
try {
  const [tables, tableCount, migrations] = await Promise.all([
    client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [[...billingTableSample]]
    ),
    client.query<{ count: string }>(
      `SELECT count(*) AS count FROM information_schema.tables
        WHERE table_schema = 'public'`
    ),
    client.query<{
      migration_name: string
      finished: boolean
      rolled_back: boolean
    }>(
      `SELECT migration_name,
              finished_at IS NOT NULL AS finished,
              rolled_back_at IS NOT NULL AS rolled_back
         FROM _prisma_migrations`
    ),
  ])
  const databaseMigrations: MigrationRow[] = migrations.rows.map((row) => ({
    migrationName: row.migration_name,
    finished: row.finished,
    rolledBack: row.rolled_back,
  }))
  decision = decideLedgerRepair({
    localMigrations,
    databaseMigrations,
    presentSampleTables: tables.rows.map((row) => row.table_name),
    publicTableCount: Number(tableCount.rows[0]?.count ?? 0),
  })

  console.log(
    JSON.stringify({
      object: 'billing_migration_baseline',
      dry_run: dryRun,
      decision,
      local_migrations: localMigrations.length,
      database_migrations: databaseMigrations.length,
    })
  )
  if (decision.action === 'refuse') process.exitCode = 1
  if (!dryRun && decision.action === 'repair') {
    await client.query('BEGIN')
    try {
      await client.query(
        `DELETE FROM _prisma_migrations WHERE migration_name = ANY($1::text[])`,
        [decision.remove]
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
} finally {
  await client.end()
}

if (!dryRun && decision.action === 'repair') {
  for (const migration of decision.resolve) {
    const result = spawnSync(
      process.execPath,
      [cli, 'migrate', 'resolve', '--applied', migration],
      { stdio: 'inherit', env: process.env }
    )
    if (result.status !== 0)
      throw new Error(`Could not resolve Billing migration ${migration}.`)
  }
}
