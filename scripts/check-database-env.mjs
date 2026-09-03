/**
 * Verifies that every Prisma workspace has the database URLs its config needs.
 *
 * Most Prisma apps read **two** connection strings:
 *
 *   <PREFIX>DATABASE_URL         Runtime connection URL (PostgreSQL direct/pooler
 *                                or Prisma Accelerate URL).
 *   <PREFIX>DIRECT_DATABASE_URL  Direct TCP URL (postgres://…), read by
 *                                `prisma.config.ts` for migrate/generate/seed.
 *
 * These failure modes are silent in their own way, which is why this check
 * exists rather than a comment in `.env.example`:
 *
 *   - A missing direct URL fails as `PrismaConfigEnvError: Cannot resolve
 *     environment variable: DIRECT_DATABASE_URL` from inside `prisma migrate
 *     deploy`, which runs as the first half of each app's `dev` script. The
 *     app never starts and the message names no file to edit.
 *   - An unsupported URL scheme sitting in the *runtime* variable fails at
 *     client construction or on the first query.
 *
 * Values are never read beyond their scheme — the connection URLs carry
 * sensitive credentials.
 *
 * Run via `pnpm check:database-env [app…|all]`; the `pnpm dev*` scripts for
 * Prisma-backed apps run it first.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse } from 'dotenv'

const repoRoot = resolve(import.meta.dirname, '..')

const ACCELERATE_PROTOCOLS = ['prisma:', 'prisma+postgres:']
const DIRECT_PROTOCOLS = ['postgres:', 'postgresql:']
const RUNTIME_PROTOCOLS = [...ACCELERATE_PROTOCOLS, ...DIRECT_PROTOCOLS]

/**
 * Every workspace with its own Prisma datastore.
 *
 * `envFiles` mirrors the `config({ path: [...] })` call in that app's
 * `prisma.config.ts`, lowest precedence first, so this check resolves exactly
 * what the Prisma CLI would. Getting that list wrong would make the check
 * disagree with the tool it is protecting.
 */
const APPS = {
  api: {
    runtime: 'DATABASE_URL',
    direct: 'DIRECT_DATABASE_URL',
    envFiles: ['.env', '.env.development', '.env.development.local'],
  },
  console: {
    runtime: 'CONSOLE_DATABASE_URL',
    direct: 'CONSOLE_DIRECT_DATABASE_URL',
    envFiles: ['.env', '.env.development', '.env.development.local'],
  },
  billing: {
    runtime: 'BILLING_DATABASE_URL',
    direct: 'BILLING_DIRECT_DATABASE_URL',
    envFiles: [
      '.env',
      '.env.development',
      '.env.development.local',
      '.env.local',
    ],
  },
  couriers: {
    runtime: 'DATABASE_URL',
    direct: 'DIRECT_DATABASE_URL',
    envFiles: [
      '.env',
      '.env.development',
      '.env.development.local',
      '.env.local',
    ],
  },
  'crm-api': {
    runtime: 'CRM_DATABASE_URL',
    direct: 'CRM_DIRECT_DATABASE_URL',
    envFiles: ['.env', '.env.development', '.env.development.local'],
  },
  'projects-api': {
    runtime: 'PROJECTS_DATABASE_URL',
    direct: 'PROJECTS_DIRECT_DATABASE_URL',
    envFiles: ['.env', '.env.development', '.env.development.local'],
  },
  'work-api': {
    runtime: 'WORK_DATABASE_URL',
    direct: 'WORK_DIRECT_DATABASE_URL',
    envFiles: ['.env', '.env.development', '.env.development.local'],
  },
  'widgets-api': {
    runtime: 'WIDGETS_DATABASE_URL',
    direct: 'WIDGETS_DIRECT_DATABASE_URL',
    envFiles: [
      '.env',
      '.env.development',
      '.env.development.local',
      '.env.local',
    ],
  },
}

/** Resolves one app's env values the way its `prisma.config.ts` would. */
function readEnv(app) {
  const resolved = {}

  for (const filename of APPS[app].envFiles) {
    const path = resolve(repoRoot, 'apps', app, filename)
    if (!existsSync(path)) continue

    for (const [key, value] of Object.entries(parse(readFileSync(path)))) {
      if (value) resolved[key] = { value, source: filename }
    }
  }

  for (const key of [APPS[app].runtime, APPS[app].direct].filter(Boolean)) {
    if (process.env[key])
      resolved[key] = { value: process.env[key], source: 'process env' }
  }

  return resolved
}

function protocolOf(value) {
  return value.slice(0, value.indexOf(':') + 1).toLowerCase()
}

function checkApp(app) {
  const { runtime, direct } = APPS[app]
  const env = readEnv(app)
  const problems = []

  const runtimeEntry = env[runtime]
  if (!runtimeEntry) {
    problems.push(
      `${runtime} is not set. It is the database connection URL the app uses at ` +
        `runtime (${RUNTIME_PROTOCOLS.join(' or ')}).`
    )
  } else if (!RUNTIME_PROTOCOLS.includes(protocolOf(runtimeEntry.value))) {
    problems.push(
      `${runtime} is a "${protocolOf(runtimeEntry.value) || 'scheme-less'}" ` +
        `URL (from ${runtimeEntry.source}), but must be ${RUNTIME_PROTOCOLS.join(' or ')}.`
    )
  }

  const directEntry = direct ? env[direct] : null
  if (direct && !directEntry) {
    problems.push(
      `${direct} is not set. prisma.config.ts reads it for migrate/generate/seed, ` +
        `so \`prisma migrate deploy\` fails before the dev server starts.`
    )
  } else if (
    directEntry &&
    !DIRECT_PROTOCOLS.includes(protocolOf(directEntry.value))
  ) {
    problems.push(
      `${direct} is a "${protocolOf(directEntry.value) || 'scheme-less'}" ` +
        `URL (from ${directEntry.source}), but the Prisma CLI needs a direct ` +
        `${DIRECT_PROTOCOLS.join(' or ')} URL.`
    )
  }

  return problems
}

const requested = process.argv.slice(2)
const scope =
  requested.length === 0 || requested.includes('all')
    ? Object.keys(APPS)
    : requested

const unknown = scope.filter((app) => !APPS[app])
if (unknown.length > 0) {
  console.error(
    `Unknown app(s): ${unknown.join(', ')}\n\n` +
      `Expected one or more of: ${Object.keys(APPS).join(', ')} (or "all").`
  )
  process.exit(1)
}

const failures = scope
  .filter((app) => existsSync(resolve(repoRoot, 'apps', app)))
  .map((app) => ({ app, problems: checkApp(app) }))
  .filter(({ problems }) => problems.length > 0)

if (failures.length === 0) {
  console.log(
    `Database environment is configured for ${scope.join(', ')} ` +
      `(runtime URL${scope.some((app) => APPS[app].direct) ? ' + direct CLI URL where required' : ''}).`
  )
  process.exit(0)
}

console.error('Database environment is incomplete.\n')
for (const { app, problems } of failures) {
  console.error(`  apps/${app}`)
  for (const problem of problems) console.error(`    - ${problem}`)
  console.error('')
}
console.error(
  'Both values come from the database provider (e.g. Neon or Prisma Postgres):\n' +
    '  Runtime URL — Neon pooled connection or Prisma Accelerate URL\n' +
    '  Direct URL  — Direct PostgreSQL connection URL\n\n' +
    'See apps/<app>/.env.example and docs/cloudflare.md.'
)
process.exit(1)
