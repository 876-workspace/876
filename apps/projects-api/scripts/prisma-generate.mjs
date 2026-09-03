#!/usr/bin/env node
/**
 * Runs `prisma generate`, supplying a placeholder `PROJECTS_DATABASE_URL` when none is
 * set.
 *
 * Two facts make this wrapper necessary:
 *
 * 1. `src/db/generated/` is gitignored, so a clean clone has no Prisma client
 *    and `tsup`/`tsc`/`vitest` cannot resolve `@/db/generated/prisma`.
 * 2. `prisma.config.ts` resolves `PROJECTS_DATABASE_URL` through Prisma's `env()`, which
 *    throws when it is unset — correct for `migrate`, which must never run
 *    against an accidental database, but `generate` only reads the schema.
 *
 * Together they mean `pnpm build` fails on any machine that has not already run
 * a migration. That is what broke the `876` monorepo production build on Vercel:
 * `prebuild` ran a bare `prisma generate`, so the whole turbo run failed with
 * `PrismaConfigEnvError: Cannot resolve environment variable: PROJECTS_DATABASE_URL`
 * before any app could compile.
 *
 * The placeholder is only ever visible to `generate`, is never written
 * anywhere, and is never used to open a connection.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const PLACEHOLDER = 'postgresql://placeholder/placeholder'

// The CLI is resolved through Node rather than found on PATH, so this works
// when run directly (`node scripts/prisma-generate.mjs`) and not only from a
// pnpm script, which is the only context that puts `node_modules/.bin` on PATH.
const require = createRequire(import.meta.url)

let cli
try {
  cli = require.resolve('prisma/build/index.js')
} catch {
  console.error(
    'Could not resolve the Prisma CLI. Run `pnpm install` in apps/projects-api first.'
  )
  process.exit(1)
}

const result = spawnSync(process.execPath, [cli, 'generate'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PROJECTS_DATABASE_URL: process.env.PROJECTS_DATABASE_URL || PLACEHOLDER,
  },
})

if (result.error) {
  console.error(`prisma generate could not start: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
