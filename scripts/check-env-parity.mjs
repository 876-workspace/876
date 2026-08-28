/**
 * Verifies that every variable an app declares in `.env.example` is actually
 * configured — locally, and (with `--vercel`) in its deployed project.
 *
 * Env gaps are the most expensive class of bug on this platform because they
 * do not look like env gaps. They surface far from their cause:
 *
 *   - An unset `BILLING_API_URL` falls back to `http://localhost:4004`, so a
 *     deployed app quietly calls a host that is not there.
 *   - A missing `API_INTERNAL_KEY` downgrades a privileged call to an
 *     app-key-only one, which the API answers `auth/no-session`. Callers that
 *     treat the result as optional then render an empty UI with no error.
 *   - A *present but wrong* app key resolves to a different app, so the
 *     downstream service reports a missing scope rather than a bad credential.
 *
 * Every one of those was diagnosed by hand before this script existed. It
 * reads only key names and never prints a value.
 *
 * Usage:
 *   pnpm check:env            # local .env* files for every app
 *   pnpm check:env <app…>     # only the named apps
 *   pnpm check:env --vercel   # also compare against Vercel production
 *
 * A key is required unless its line in `.env.example` carries an `# optional`
 * comment, which is how a variable with a working in-code default opts out.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse } from 'dotenv'

const repoRoot = resolve(import.meta.dirname, '..')
const appsDir = resolve(repoRoot, 'apps')

/** Vercel production project per app directory. Apps with no entry are local-only. */
const VERCEL_PROJECTS = {
  876: '876-app',
  api: '876-api',
  billing: '876-billing',
  'billing-api': '876-billing-api',
  console: '876-console',
  couriers: '876-couriers',
  'couriers-api': '876-couriers-api',
  crm: '876-crm',
  'crm-api': '876-crm-api',
  enterprise: '876-enterprise',
  invoice: '876-invoice',
  'storage-api': '876-storage-api',
  'widgets-api': '876-widgets-api',
}

/** The env files an app may carry, in the order a dev tool would load them. */
const LOCAL_ENV_FILES = [
  '.env',
  '.env.development',
  '.env.development.local',
  '.env.local',
]

/**
 * Reads the keys an app declares, splitting them by whether they are required.
 *
 * @param examplePath - Absolute path to the app's `.env.example`.
 * @returns Declared key names, partitioned into required and optional.
 */
function declaredKeys(examplePath) {
  const required = []
  const optional = []

  for (const line of readFileSync(examplePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const key = trimmed.split('=')[0]?.trim()
    if (!key) continue
    if (/#\s*optional/i.test(trimmed)) optional.push(key)
    else required.push(key)
  }

  return { required, optional }
}

/**
 * Collects every key configured locally for an app, including the repo root
 * `.env`, which several apps inherit shared values from.
 *
 * @param appPath - Absolute path to the app directory.
 * @returns The set of configured key names. Values are never retained.
 */
function localKeys(appPath) {
  const keys = new Set()

  for (const file of [
    resolve(repoRoot, '.env'),
    ...LOCAL_ENV_FILES.map((name) => resolve(appPath, name)),
  ]) {
    if (!existsSync(file)) continue
    for (const [key, value] of Object.entries(parse(readFileSync(file)))) {
      if (value !== '') keys.add(key)
    }
  }

  return keys
}

/**
 * Reads the key names configured for a Vercel project's production environment.
 *
 * @param project - The Vercel project name.
 * @returns Configured key names, or `null` when the listing could not be read.
 */
function vercelKeys(project) {
  try {
    const output = execFileSync(
      'npx',
      ['vercel', 'env', 'ls', 'production', '--project', project],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    )

    const keys = new Set()
    for (const line of output.split('\n')) {
      const key = line.trim().split(/\s+/)[0]
      if (/^[A-Z][A-Z0-9_]*$/.test(key ?? '')) keys.add(key)
    }
    return keys
  } catch {
    return null
  }
}

const args = process.argv.slice(2)
const checkVercel = args.includes('--vercel')
const requested = args.filter((arg) => !arg.startsWith('--'))

const apps = readdirSync(appsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(resolve(appsDir, name, '.env.example')))
  .filter((name) => requested.length === 0 || requested.includes(name))

let failed = false

for (const app of apps) {
  const appPath = resolve(appsDir, app)
  const { required, optional } = declaredKeys(resolve(appPath, '.env.example'))
  const configured = localKeys(appPath)

  const missingLocal = required.filter((key) => !configured.has(key))
  const missingOptional = optional.filter((key) => !configured.has(key))

  const project = VERCEL_PROJECTS[app]
  let missingRemote = []
  let remoteUnavailable = false

  if (checkVercel && project) {
    const remote = vercelKeys(project)
    if (remote === null) remoteUnavailable = true
    else missingRemote = required.filter((key) => !remote.has(key))
  }

  const clean =
    missingLocal.length === 0 &&
    missingRemote.length === 0 &&
    !remoteUnavailable

  if (clean && missingOptional.length === 0) {
    console.log(`✓ ${app}`)
    continue
  }

  console.log(`${clean ? '✓' : '✗'} ${app}`)
  if (missingLocal.length > 0) {
    failed = true
    console.log(`    missing locally:  ${missingLocal.join(', ')}`)
  }
  if (missingRemote.length > 0) {
    failed = true
    console.log(`    missing on ${project}: ${missingRemote.join(', ')}`)
  }
  if (remoteUnavailable) {
    console.log(`    could not read ${project} (not linked, or not signed in)`)
  }
  if (missingOptional.length > 0) {
    console.log(`    unset but optional: ${missingOptional.join(', ')}`)
  }
}

if (failed) {
  console.error(
    '\nEnv gap: a declared variable is not configured. Set it, or mark it' +
      ' `# optional` in .env.example when the code has a working default.'
  )
  process.exit(1)
}
