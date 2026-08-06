#!/usr/bin/env node
/**
 * Refuses to run `prisma migrate dev` against a database that carries another
 * service's tables.
 *
 * This Postgres instance is shared: apps/billing-api owns 76 `billing_*` tables
 * and apps/storage-api owns the `storage_*` tables, both managed by Alembic.
 * They are deliberately absent from this service's Prisma schema. `migrate dev`
 * compares the database against the migration history, sees tables no migration
 * created, reports drift, and offers to RESET — which would drop every billing
 * and storage table in the environment.
 *
 * Author migrations against a scratch database (a Neon branch, or a local
 * Postgres) and apply them in real environments with `prisma migrate deploy`,
 * which applies pending migrations and never inspects drift.
 *
 * Override for a genuinely disposable database with ALLOW_MIGRATE_DEV=1.
 */
import { execFileSync } from 'node:child_process'

import { Client } from 'pg'

const FOREIGN_TABLE_PREFIXES = ['billing_', 'storage_']

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('guard-migrate: DATABASE_URL is not set.')
    process.exit(1)
  }

  if (process.env.ALLOW_MIGRATE_DEV === '1') {
    console.warn(
      'guard-migrate: ALLOW_MIGRATE_DEV=1 — skipping the shared-database check.'
    )
    return run()
  }

  const client = new Client({ connectionString: url })
  await client.connect()
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND (${FOREIGN_TABLE_PREFIXES.map((_, i) => `tablename LIKE $${i + 1}`).join(' OR ')})
      LIMIT 5`,
    FOREIGN_TABLE_PREFIXES.map((prefix) => `${prefix}%`)
  )
  await client.end()

  if (rows.length > 0) {
    const sample = rows.map((r) => r.tablename).join(', ')
    console.error(
      [
        '',
        'guard-migrate: REFUSING to run `prisma migrate dev`.',
        '',
        `  This database contains tables owned by another service (${sample}…).`,
        '  `migrate dev` would report them as drift and offer to reset the database,',
        '  dropping every billing and storage table in this environment.',
        '',
        '  Author the migration against a scratch database instead:',
        '    DATABASE_URL=<scratch> pnpm --filter @876/api db:migrate',
        '  then apply it with:',
        '    pnpm --filter @876/api db:deploy',
        '',
        '  See apps/api/docs/database.md.',
        '',
      ].join('\n')
    )
    process.exit(1)
  }

  run()
}

function run() {
  execFileSync('npx', ['prisma', 'migrate', 'dev', ...process.argv.slice(2)], {
    stdio: 'inherit',
  })
}

main().catch((error) => {
  console.error('guard-migrate:', error.message)
  process.exit(1)
})
