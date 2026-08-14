import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const scriptDir = dirname(fileURLToPath(import.meta.url))

/** Builds the dependency-free retry script required by every offline page. */
export async function buildOfflineRecovery(appDir) {
  await build({
    absWorkingDir: appDir,
    entryPoints: [join(scriptDir, 'offline-recovery.ts')],
    outfile: join(appDir, 'public/pwa/offline-recovery.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    platform: 'browser',
  })
}

/** Uses the actual asset contents so a changed offline fallback is re-cached. */
export function assetRevision(appDir, url) {
  return fileRevision(join(appDir, 'public', url))
}

export function fileRevision(filePath) {
  return createHash('sha1').update(readFileSync(filePath)).digest('hex')
}

/**
 * Version generated Next.js routes by the build commit because their final
 * HTML can depend on components outside the route source file.
 */
export function buildRevision(appDir) {
  const revision =
    process.env.WORKERS_CI_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.CF_PAGES_COMMIT_SHA
  if (revision) return revision

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: appDir,
      encoding: 'utf-8',
    }).trim()
  } catch {
    return randomUUID()
  }
}
