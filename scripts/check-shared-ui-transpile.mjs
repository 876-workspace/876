#!/usr/bin/env node
/**
 * Every Next app must build its `transpilePackages` from
 * `scripts/shared-ui-packages.mjs`, so a shared UI package added once reaches
 * every app — existing and future — without a per-app edit.
 *
 * A missing entry is invisible at build time and surfaces only in the browser
 * as `Element type is invalid. Received a promise that resolves to: undefined`.
 * That is what this check exists to prevent.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { SHARED_UI_PACKAGES } from './shared-ui-packages.mjs'

const APPS_ROOT = 'apps'
const violations = []

for (const app of readdirSync(APPS_ROOT, { withFileTypes: true })) {
  if (!app.isDirectory()) continue
  const config = join(APPS_ROOT, app.name, 'next.config.ts')
  if (!existsSync(config)) continue

  const source = readFileSync(config, 'utf8')
  if (!/transpilePackages/.test(source)) continue

  if (!source.includes('sharedTranspilePackages(')) {
    violations.push(
      `${config}: builds transpilePackages by hand. Use sharedTranspilePackages([...]) ` +
        `from scripts/shared-ui-packages.mjs so shared UI packages stay in sync.`
    )
    continue
  }

  for (const pkg of SHARED_UI_PACKAGES) {
    const literal = `'${pkg}',`
    if (source.includes(literal))
      violations.push(
        `${config}: lists ${pkg} explicitly. It is already supplied by sharedTranspilePackages().`
      )
  }
}

if (violations.length > 0) {
  console.error(`shared-ui-transpile: ${violations.length} violation(s)\n`)
  for (const violation of violations) console.error(`  - ${violation}`)
  console.error('\nSee scripts/shared-ui-packages.mjs')
  process.exit(1)
}

console.log('shared-ui-transpile: OK')
