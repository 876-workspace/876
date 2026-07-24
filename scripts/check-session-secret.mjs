/**
 * Verifies that the API and every app agree on the session cookie secret.
 *
 * `apps/api` seals the `876-session` cookie with an HMAC over
 * `SESSION_COOKIE_SECRET` (falling back to `WORKOS_COOKIE_PASSWORD`, then to a
 * shared dev default). Each Next.js app verifies that HMAC with the same
 * resolution order in `@876/core/auth/session-cookie`. If the two sides land on
 * different secrets, every signature check fails — and it fails **silently**:
 * the cookie is set correctly, the browser stores it, and the app simply treats
 * the request as signed-out and bounces back to `/login`. No error is logged
 * anywhere, which makes it look like the identity provider is broken.
 *
 * The mismatch is easy to reach because `.env` is gitignored and per-machine:
 * moving the repo to a new workspace can leave the apps carrying a real secret
 * while the API silently falls back to the dev default.
 *
 * Run via `pnpm check:session-secret`; the `pnpm dev*` scripts run it first.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse } from 'dotenv'

const repoRoot = resolve(import.meta.dirname, '..')

// Every workspace that seals or verifies the session cookie.
const APPS = ['api', '876', 'enterprise', 'console', 'couriers', 'billing']

// Highest precedence last, matching how Next.js and pydantic-settings load them.
const ENV_FILES = ['.env.development', '.env', '.env.development.local']

// Mirrors `resolveSessionCookieSecret()` in @876/core and
// `resolved_session_cookie_secret` in apps/api/core/config.py.
const SECRET_KEYS = ['SESSION_COOKIE_SECRET', 'WORKOS_COOKIE_PASSWORD']
const DEV_DEFAULT = 'dev-only-session-cookie-secret-change-before-production'

/**
 * Resolves the secret an app would use, and the file it came from.
 *
 * @param app - Workspace directory name under `apps/`.
 * @returns The resolved secret plus its source, using the dev default when
 *   nothing is configured (which is what both runtimes do outside production).
 */
function resolveSecret(app) {
  const values = {}
  const sources = {}

  for (const filename of ENV_FILES) {
    const path = resolve(repoRoot, 'apps', app, filename)
    if (!existsSync(path)) continue

    for (const [key, value] of Object.entries(parse(readFileSync(path)))) {
      if (!SECRET_KEYS.includes(key) || !value) continue
      values[key] = value
      sources[key] = filename
    }
  }

  for (const key of SECRET_KEYS) {
    if (values[key])
      return { secret: values[key], source: `${key} in ${sources[key]}` }
  }

  return { secret: DEV_DEFAULT, source: 'dev default (no secret configured)' }
}

const resolved = APPS.filter((app) =>
  existsSync(resolve(repoRoot, 'apps', app))
).map((app) => ({ app, ...resolveSecret(app) }))

const distinct = new Set(resolved.map((entry) => entry.secret))

if (distinct.size <= 1) {
  const [{ source }] = resolved
  console.log(
    `Session cookie secret is consistent across all apps (${source}).`
  )
  process.exit(0)
}

// Group by secret so the output shows which side is the outlier without ever
// printing the secrets themselves.
const groups = new Map()
for (const { app, secret, source } of resolved) {
  if (!groups.has(secret)) groups.set(secret, [])
  groups.get(secret).push(`${app} (${source})`)
}

console.error(
  'Session cookie secret mismatch — logins will silently fail.\n\n' +
    'apps/api seals the 876-session cookie with one secret while these apps\n' +
    'verify it with another, so every session is treated as signed-out and\n' +
    'redirected to /login with no error logged.\n'
)

let group = 0
for (const apps of groups.values()) {
  console.error(`  secret ${++group}: ${apps.join(', ')}`)
}

console.error(
  '\nFix: set the same SESSION_COOKIE_SECRET in every app above, including\n' +
    'apps/api/.env. These files are gitignored, so each workspace needs its own\n' +
    'copy — or remove the key everywhere to fall back to the shared dev default.'
)

process.exit(1)
