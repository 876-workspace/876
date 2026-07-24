// Precompiles the Serwist service worker to `public/sw.js`.
//
// `@serwist/turbopack`'s route (`/serwist/[path]`) bundles the worker per
// request, which cannot run on Cloudflare Workers: it reaches for `esbuild-wasm`
// (`Wasm code generation disallowed by embedder`) and reads the git SHA with
// `spawnSync`. Both are build-machine operations, so they happen here instead
// and ship as a static asset.

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Precache revision. Cloudflare Workers Builds and GitHub Actions both expose
 * the commit; a local build falls back to git, then to a random value so the
 * worker still updates.
 */
function resolveRevision() {
  const fromEnv =
    process.env.WORKERS_CI_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.CF_PAGES_COMMIT_SHA
  if (fromEnv) return fromEnv

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: appDir,
      encoding: 'utf-8',
    }).trim()
  } catch {
    return randomUUID()
  }
}

const precacheEntries = [{ url: '/~offline', revision: resolveRevision() }]

mkdirSync(join(appDir, 'public'), { recursive: true })

await build({
  absWorkingDir: appDir,
  entryPoints: ['src/app/sw.ts'],
  outfile: 'public/sw.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2022',
  platform: 'browser',
  define: {
    'process.env.NODE_ENV': '"production"',
    'self.__SW_MANIFEST': JSON.stringify(precacheEntries),
  },
})

console.log(
  `Service worker written to public/sw.js (${precacheEntries.length} precache entry)`
)
