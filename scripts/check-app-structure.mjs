#!/usr/bin/env node
/**
 * Structural checks for `.claude/rules/app-structure.md`.
 *
 * These are the invariants ESLint cannot express, because each compares two
 * paths or inspects the shape of the tree rather than a single import
 * specifier:
 *
 *   1. no non-route file sitting as a bare sibling of page.tsx
 *   2. no barrel index.ts in components/ or features/
 *   3. no file (or exported symbol) prefixed with its own app's name
 *   4. no *sideways* import of another route subtree's _components/
 *
 * Check 4 is the important one and the reason this script exists: a descendant
 * route may import an ancestor's `_components/` — that is what "private to the
 * subtree" means — but a sibling subtree may not. That is a path-prefix test
 * between the importing file and the owning route, which no ESLint import
 * pattern can perform.
 *
 * Usage: node scripts/check-app-structure.mjs [app...]
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname, sep } from 'node:path'

const APPS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['console', 'billing', 'couriers', '876', 'enterprise']

/** Next.js special files that legitimately live in a route directory. */
const ROUTE_FILES = new Set([
  'page.tsx',
  'layout.tsx',
  'loading.tsx',
  'error.tsx',
  'global-error.tsx',
  'not-found.tsx',
  'template.tsx',
  'default.tsx',
  'route.ts',
  'route.tsx',
  'manifest.ts',
  'sitemap.ts',
  'robots.ts',
  'opengraph-image.tsx',
  'twitter-image.tsx',
  'icon.tsx',
  'apple-icon.tsx',
  'sw.ts',
])

/** Directory names whose contents are exempt from the route-file check. */
const PRIVATE_DIRS = new Set(['_components', '_lib'])

/**
 * An app's own name, as it must not appear as a file prefix.
 *
 * `symbols: false` disables the *symbol* half of the check while keeping the
 * filename half. Use it where the app's name is also its domain vocabulary:
 * in the Billing app "billing" is a real noun (`billingTiming`,
 * `advanceBillingDays`, `SubscriptionBillingItemAction`) and several of those
 * are API contract fields, so a prefix heuristic there is all false positives.
 * A filename like `billing-sidebar.tsx` is still unambiguously redundant.
 */
const APP_PREFIX = {
  console: { name: 'console', symbols: true },
  billing: { name: 'billing', symbols: false },
  couriers: { name: 'couriers', symbols: true },
  enterprise: { name: 'enterprise', symbols: true },
  876: null, // numeric; no meaningful prefix form
}

const failures = []

function fail(app, check, detail) {
  failures.push({ app, check, detail })
}

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      walk(full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

function exists(p) {
  try {
    statSync(p)
    return true
  } catch {
    return false
  }
}

for (const app of APPS) {
  const root = `apps/${app}/src`
  if (!exists(root)) continue

  const appDir = join(root, 'app')
  const componentsDir = join(root, 'components')
  const featuresDir = join(root, 'features')

  // ---- 1. bare non-route files beside page.tsx -----------------------------
  for (const file of walk(appDir)) {
    const rel = relative(appDir, file)
    const segments = rel.split(sep)
    if (segments.some((s) => PRIVATE_DIRS.has(s))) continue
    if (segments.some((s) => s === '__tests__')) continue

    const name = segments.at(-1)
    if (!/\.tsx?$/.test(name)) continue // css, images, etc. are not our concern
    if (ROUTE_FILES.has(name)) continue
    if (name.startsWith('_')) continue // _data.ts and friends
    // A route file's own test belongs beside its subject, not in _components/.
    // page.test.tsx tests page.tsx; burying it under _components/ to satisfy a
    // naive "no bare .tsx" check separates a test from the thing it tests.
    if (
      /\.test\.tsx?$/.test(name) &&
      ROUTE_FILES.has(name.replace(/\.test\./, '.'))
    )
      continue
    // the api/ tree is route-handler infrastructure, out of scope
    if (segments[0] === 'api') continue

    fail(app, 'bare-non-route-file', `apps/${app}/src/app/${rel}`)
  }

  // ---- 1b. route tests buried in a private folder --------------------------
  // Check 1 skips anything under _components/ or _lib/ before it reaches the
  // route-test exception, so a page.test.tsx wrongly moved *into* a private
  // folder slipped through. It is the mirror image of the same mistake: a
  // route file's test belongs beside its subject either way.
  for (const file of walk(appDir)) {
    const segments = relative(appDir, file).split(sep)
    if (!segments.some((s) => PRIVATE_DIRS.has(s))) continue

    const name = segments.at(-1)
    if (!/\.test\.tsx?$/.test(name)) continue
    if (!ROUTE_FILES.has(name.replace(/\.test\./, '.'))) continue

    fail(app, 'route-test-in-private-folder', file)
  }

  // ---- 2. barrels ---------------------------------------------------------
  for (const dir of [componentsDir, featuresDir]) {
    for (const file of walk(dir)) {
      const name = file.split(sep).at(-1)
      if (name === 'index.ts' || name === 'index.tsx') {
        fail(app, 'barrel-index', file)
      }
    }
  }

  // ---- 3. app-name prefixes ----------------------------------------------
  const prefixCfg = APP_PREFIX[app]
  if (prefixCfg) {
    const prefix = prefixCfg.name
    const Pascal = `${prefix[0].toUpperCase()}${prefix.slice(1)}`
    // Only flag symbols *declared* here. A type imported from src/types/ (e.g.
    // ConsoleUser) is that module's name to own, and renaming those is a
    // separate change with a much wider blast radius.
    // Catches both PascalCase (ConsoleSidebar) and camelCase
    // (consoleWidgetCatalog) declarations. The trailing [A-Z] is what stops
    // `consoles` or `Consolidated` from matching.
    const symbolRe = new RegExp(
      `(?:function|const|let|class|type|interface|enum)\\s+((?:${Pascal}|${prefix})[A-Z]\\w*)`,
      'g'
    )
    for (const dir of [componentsDir, featuresDir]) {
      for (const file of walk(dir)) {
        const name = file.split(sep).at(-1)
        if (name.startsWith(`${prefix}-`)) {
          fail(app, 'app-name-file-prefix', file)
        }
        if (!prefixCfg.symbols) continue
        if (!/\.tsx?$/.test(file)) continue
        const src = readFileSync(file, 'utf8')
        const hits = new Set([...src.matchAll(symbolRe)].map((m) => m[1]))
        for (const hit of hits) {
          fail(app, 'app-name-symbol-prefix', `${file}: ${hit}`)
        }
      }
    }
  }

  // ---- 4. sideways _components / _lib imports -----------------------------
  // Legal only when the importing file lives inside the owning route subtree.
  const importRe = /from\s+['"]([^'"]+)['"]/g
  for (const file of walk(appDir)) {
    if (!/\.tsx?$/.test(file)) continue
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(importRe)) {
      const spec = m[1]
      if (!spec.includes('_components') && !spec.includes('_lib')) continue

      // Resolve the owning route directory of the import target.
      let targetDir
      if (spec.startsWith('@/app/')) {
        targetDir = join(appDir, spec.slice('@/app/'.length))
      } else if (spec.startsWith('.')) {
        targetDir = join(dirname(file), spec)
      } else {
        continue
      }

      const marker = targetDir.split(sep).findIndex((s) => PRIVATE_DIRS.has(s))
      if (marker === -1) continue
      const owningRoute = targetDir.split(sep).slice(0, marker).join(sep)

      // The importing file must live inside the owning route's subtree.
      const importerDir = dirname(file)
      if (
        importerDir !== owningRoute &&
        !importerDir.startsWith(owningRoute + sep)
      ) {
        fail(
          app,
          'sideways-private-import',
          `${file}\n      imports ${spec}\n      owned by ${owningRoute}`
        )
      }
    }
  }

  // ---- 5. components/ importing features/ (belt and braces with ESLint) ---
  for (const file of walk(componentsDir)) {
    if (!/\.tsx?$/.test(file)) continue
    if (/@\/features\//.test(readFileSync(file, 'utf8'))) {
      fail(app, 'components-imports-features', file)
    }
  }
}

if (failures.length === 0) {
  console.log(`app-structure: OK (${APPS.join(', ')})`)
  process.exit(0)
}

const byCheck = new Map()
for (const f of failures) {
  if (!byCheck.has(f.check)) byCheck.set(f.check, [])
  byCheck.get(f.check).push(f)
}

console.error(`app-structure: ${failures.length} violation(s)\n`)
for (const [check, items] of byCheck) {
  console.error(`  ${check} (${items.length})`)
  for (const i of items) console.error(`    - ${i.detail}`)
  console.error('')
}
console.error('See .claude/rules/app-structure.md')
process.exit(1)
