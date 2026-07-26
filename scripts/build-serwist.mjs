// Precompile an app's Serwist worker to `public/sw.js`.
//
// The dynamic @serwist/turbopack route cannot run on Cloudflare Workers
// because worker startup disallows its build-machine APIs. Calling this script
// from an app workspace keeps compilation on the build machine and lets
// OpenNext ship the result as a static asset.

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const appDir = process.cwd()
const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(
  readFileSync(join(appDir, 'package.json'), 'utf-8')
)
const appName = packageJson.name?.match(/^@876\/(.+)$/)?.[1]
if (!appName) throw new Error('Serwist builds require an @876 app workspace')

function resolveRevision() {
  const fromEnvironment =
    process.env.WORKERS_CI_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.CF_PAGES_COMMIT_SHA
  if (fromEnvironment) return fromEnvironment

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: appDir,
      encoding: 'utf-8',
    }).trim()
  } catch {
    return randomUUID()
  }
}

const revision = resolveRevision()
const precacheEntries = [
  '/offline.html',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/icon-maskable-512.png',
  '/pwa/apple-touch-icon.png',
].map((url) => ({ url, revision }))

mkdirSync(join(appDir, 'public'), { recursive: true })

await build({
  absWorkingDir: appDir,
  entryPoints: [join(scriptDir, 'serwist-shell-worker.ts')],
  outfile: 'public/sw.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2022',
  platform: 'browser',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.SERWIST_CACHE_ID': JSON.stringify(`876-${appName}`),
    'self.__SW_MANIFEST': JSON.stringify(precacheEntries),
  },
})

console.log(
  `Service worker written to public/sw.js (${precacheEntries.length} precache entries)`
)
