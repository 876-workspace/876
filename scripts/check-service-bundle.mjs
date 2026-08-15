/**
 * Verifies that every bundled Express service inlines its `@876/*` workspace
 * dependencies into the container bundle.
 *
 * The container images run a single tsup-bundled `dist/server.js` against a
 * filtered `node_modules`. The `@876/*` workspace packages (`@876/server`,
 * `@876/core`, `@876/settings`, `@876/billing`, …) ship **raw TypeScript**
 * through their `exports` maps — nothing compiles them to a runtime-resolvable
 * entry. tsup treats every declared dependency as external by default, so a
 * bare `import '@876/server'` survives the bundle and Node fails at container
 * boot with:
 *
 *     ERR_MODULE_NOT_FOUND: Cannot find package '@876/server'
 *
 * That is exactly how PR #274 took the deployed API down: it added `@876/server`
 * to the API's dependencies while the API's tsup config had no `noExternal` at
 * all, so the image built green in unit tests but the container never started —
 * and every Console page that reached the API showed "Something went wrong".
 *
 * The invariant this enforces, per `.claude/rules/express-api.md`: a bundled
 * service must list every `@876/*` runtime dependency in its tsup `noExternal`.
 * A `@876/*` dependency that must genuinely stay external (a future package that
 * ships compiled JS) is opted out with a `bundle-check-allow-external` comment
 * beside its `dependencies` entry.
 *
 * Run via `pnpm check:service-bundle`; wired into the "App structure" CI check
 * so a service that adds an un-inlined workspace import cannot merge.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const appsDir = resolve(repoRoot, 'apps')

/**
 * A bundled service is any `apps/*` with a `tsup.config.ts` — that config is
 * what produces the single-file container bundle. Discovering them this way
 * means a new Express service is covered the moment it has a tsup config,
 * with no list to keep in sync here.
 *
 * @returns Service directory names under `apps/`, sorted.
 */
function findBundledServices() {
  return readdirSync(appsDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(resolve(appsDir, entry.name, 'tsup.config.ts'))
    )
    .map((entry) => entry.name)
    .sort()
}

/**
 * Extracts the string literals inside the tsup config's `noExternal` array.
 *
 * The configs declare `noExternal` as a static array of string literals, so a
 * targeted read of that one array is reliable without evaluating the TS module.
 * A missing `noExternal` (the pre-#274 API state) yields an empty set, which is
 * the correct "nothing is inlined" answer.
 *
 * @param serviceDir - Service directory name under `apps/`.
 * @returns The set of package names listed in `noExternal`.
 */
function readNoExternal(serviceDir) {
  const source = readFileSync(
    resolve(appsDir, serviceDir, 'tsup.config.ts'),
    'utf8'
  )

  const match = source.match(/noExternal:\s*\[([\s\S]*?)\]/)
  if (!match) return new Set()

  const literals = match[1].match(/['"]([^'"]+)['"]/g) ?? []
  return new Set(literals.map((literal) => literal.slice(1, -1)))
}

/**
 * Reads a service's `@876/*` runtime dependencies, honoring an inline
 * `bundle-check-allow-external` opt-out on the same package.json line.
 *
 * @param serviceDir - Service directory name under `apps/`.
 * @returns The `@876/*` dependency names that must be inlined.
 */
function readWorkspaceDeps(serviceDir) {
  const path = resolve(appsDir, serviceDir, 'package.json')
  const raw = readFileSync(path, 'utf8')
  const pkg = JSON.parse(raw)

  const allowedExternal = new Set(
    raw
      .split('\n')
      .filter((line) => line.includes('bundle-check-allow-external'))
      .flatMap((line) => line.match(/"(@876\/[^"]+)"/g) ?? [])
      .map((literal) => literal.slice(1, -1))
  )

  return Object.keys(pkg.dependencies ?? {})
    .filter((dep) => dep.startsWith('@876/') && !allowedExternal.has(dep))
    .sort()
}

const services = findBundledServices()
const failures = []

for (const service of services) {
  const inlined = readNoExternal(service)
  const missing = readWorkspaceDeps(service).filter((dep) => !inlined.has(dep))

  if (missing.length > 0) failures.push({ service, missing })
}

if (failures.length === 0) {
  const summary = services.map((service) => `@876/${service}`).join(', ')
  console.log(
    `All bundled services inline their @876/* workspace deps (${summary}).`
  )
  process.exit(0)
}

console.error(
  'Bundled service is missing @876/* workspace deps from tsup noExternal —\n' +
    'the container image will build, but crash at boot with\n' +
    'ERR_MODULE_NOT_FOUND because these packages ship raw TypeScript and are\n' +
    'not resolvable at runtime unless inlined.\n'
)

for (const { service, missing } of failures) {
  console.error(
    `  apps/${service}/tsup.config.ts — add to noExternal: ${missing.join(', ')}`
  )
}

console.error(
  "\nFix: list each package above in that service's tsup `noExternal` array.\n" +
    'If a package genuinely ships compiled, runtime-resolvable JS, opt it out\n' +
    'with a `bundle-check-allow-external` comment beside its dependencies entry.'
)

process.exit(1)
