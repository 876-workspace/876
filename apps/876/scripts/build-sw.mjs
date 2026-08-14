// Precompiles the Serwist service worker to `public/sw.js`.
//
// `@serwist/turbopack`'s route (`/serwist/[path]`) bundles the worker per
// request, which cannot run on Cloudflare Workers: it reaches for `esbuild-wasm`
// (`Wasm code generation disallowed by embedder`) and reads the git SHA with
// `spawnSync`. Both are build-machine operations, so they happen here instead
// and ship as a static asset.

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import {
  assetRevision,
  buildRevision,
  buildOfflineRecovery,
} from '../../../scripts/build-pwa-assets.mjs'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')

await buildOfflineRecovery(appDir)

const precacheEntries = [
  {
    url: '/~offline',
    revision: buildRevision(appDir),
  },
  {
    url: '/pwa/offline-recovery.js',
    revision: assetRevision(appDir, 'pwa/offline-recovery.js'),
  },
]

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
