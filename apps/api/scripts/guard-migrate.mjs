#!/usr/bin/env node
/**
 * Requires an explicit opt-in before running `prisma migrate dev`.
 *
 * The API now owns an isolated Prisma Postgres database. `migrate dev` can still
 * reset its target when it detects drift, so it must never run accidentally
 * against a persistent environment.
 *
 * Author migrations against a disposable scratch Postgres database and apply
 * them in real environments with `prisma migrate deploy`, which applies pending
 * migrations and never inspects drift.
 *
 * Override for a genuinely disposable database with ALLOW_MIGRATE_DEV=1.
 */
import { execFileSync } from 'node:child_process'

function main() {
  if (process.env.ALLOW_MIGRATE_DEV !== '1') {
    console.error(
      [
        '',
        'guard-migrate: REFUSING to run `prisma migrate dev`.',
        '',
        '  `migrate dev` may reset its target when it detects drift.',
        '  Point DATABASE_URL at a disposable scratch database and opt in:',
        '',
        '    ALLOW_MIGRATE_DEV=1 DATABASE_URL=<scratch> pnpm --filter @876/api db:migrate',
        '  then apply it with:',
        '    pnpm --filter @876/api db:deploy',
        '',
        '  See apps/api/docs/database.md.',
        '',
      ].join('\n')
    )
    process.exit(1)
  }

  console.warn(
    'guard-migrate: ALLOW_MIGRATE_DEV=1 — confirm DATABASE_URL is disposable.'
  )
  run()
}

function run() {
  execFileSync(
    'pnpm',
    ['exec', 'prisma', 'migrate', 'dev', ...process.argv.slice(2)],
    { stdio: 'inherit' }
  )
}

main()
