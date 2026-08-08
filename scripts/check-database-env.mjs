/**
 * Verifies that every Prisma workspace has both halves of its database config.
 *
 * Each Prisma app now reads **two** connection strings, and they are not
 * interchangeable:
 *
 *   <PREFIX>DATABASE_URL         Prisma Accelerate URL (prisma+postgres://…),
 *                                passed to `new PrismaClient({ accelerateUrl })`
 *                                at runtime.
 *   <PREFIX>DIRECT_DATABASE_URL  Direct TCP URL (postgres://…), read by
 *                                `prisma.config.ts` for migrate/generate/seed.
 *
 * Both failure modes are silent in their own way, which is why this check
 * exists rather than a comment in `.env.example`:
 *
 *   - A missing direct URL fails as `PrismaConfigEnvError: Cannot resolve
 *     environment variable: DIRECT_DATABASE_URL` from inside `prisma migrate
 *     deploy`, which runs as the first half of each app's `dev` script. The
 *     app never starts and the message names no file to edit.
 *   - A direct URL sitting in the *runtime* variable does not fail at all until
 *     the first query, which then surfaces as an opaque Prisma internal error.
 *     That took the whole platform down on 2026-08-08.
 *
 * Values are never read beyond their scheme — the Accelerate URL carries an API
 * key and the direct URL carries a password.
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
    envFiles: ['.env', '.env.development.local'],
  },
  billing: {
    runtime: 'BILLING_DATABASE_URL',
    direct: 'BILLING_DIRECT_DATABASE_URL',
    envFiles: ['.env', '.env.local'],
  },
  couriers: {
    runtime: 'DATABASE_URL',
    direct: 'DIRECT_DATABASE_URL',
    envFiles: ['.env', '.env.local'],
  },
  'widgets-api': {
    runtime: 'WIDGETS_DATABASE_URL',
    direct: 'WIDGETS_DIRECT_DATABASE_URL',
    envFiles: ['.env', '.env.local'],
  },
}

/**
 * Resolves one app's env values the way its `prisma.config.ts` would.
 *
 * @param app - Workspace directory name under `apps/`.
 * @returns Map of variable name to `{ value, source }`.
 */
function readEnv(app) {
  const resolved = {}

  for (const filename of APPS[app].envFiles) {
    const path = resolve(repoRoot, 'apps', app, filename)
    if (!existsSync(path)) continue

    for (const [key, value] of Object.entries(parse(readFileSync(path)))) {
      if (value) resolved[key] = { value, source: filename }
    }
  }

  // A variable exported in the shell wins over any file, same as the CLI.
  for (const key of [APPS[app].runtime, APPS[app].direct]) {
    if (process.env[key]) {
      resolved[key] = { value: process.env[key], source: 'process env' }
    }
  }

  return resolved
}

/**
 * The scheme of a URL, lowercased and including the colon.
 *
 * @param value - A connection string.
 * @returns e.g. `postgres:`, or `''` when there is no scheme.
 */
function protocolOf(value) {
  return value.slice(0, value.indexOf(':') + 1).toLowerCase()
}

/**
 * Checks one app's pair of connection strings.
 *
 * @param app - Workspace directory name under `apps/`.
 * @returns Human-readable problems; empty when the app is configured correctly.
 */
function checkApp(app) {
  const { runtime, direct } = APPS[app]
  const env = readEnv(app)
  const problems = []

  const runtimeEntry = env[runtime]
  if (!runtimeEntry) {
    problems.push(
      `${runtime} is not set. It is the Prisma Accelerate URL the app uses at ` +
        `runtime (${ACCELERATE_PROTOCOLS.join(' or ')}).`
    )
  } else if (!ACCELERATE_PROTOCOLS.includes(protocolOf(runtimeEntry.value))) {
    problems.push(
      `${runtime} is a "${protocolOf(runtimeEntry.value) || 'scheme-less'}" ` +
        `URL (from ${runtimeEntry.source}), but it is passed as ` +
        `\`accelerateUrl\` and must be ${ACCELERATE_PROTOCOLS.join(' or ')}. ` +
        `Move this value to ${direct} and put the Accelerate URL here.`
    )
  }

  const directEntry = env[direct]
  if (!directEntry) {
    problems.push(
      `${direct} is not set. prisma.config.ts reads it for migrate/generate/seed, ` +
        `so \`prisma migrate deploy\` fails before the dev server starts.`
    )
  } else if (!DIRECT_PROTOCOLS.includes(protocolOf(directEntry.value))) {
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
      `(Accelerate runtime URL + direct CLI URL).`
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
  'Both values come from the same Prisma Postgres database:\n' +
    '  Accelerate URL — Prisma Console > the database > "Connect" (prisma+postgres://…)\n' +
    '  Direct URL     — the same page, "Direct connection" (postgres://…)\n\n' +
    'See apps/<app>/.env.example and docs/cloudflare.md.'
)
process.exit(1)
