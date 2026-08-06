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

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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

  // ---- 6. page-shaped loading.tsx covering child routes -------------------
  // A segment's loading.tsx is the nearest Suspense boundary above every child
  // route's *layout* (a layout renders outside its own loading.tsx). So a list
  // or overview skeleton left at a segment with children replays that page's
  // shape on the way into anything beneath it — clicking a row blanks the table
  // and re-renders it before the record appears.
  //
  // The fix is a (list) / (overview) route group holding the page and its
  // skeleton, leaving the parent a shape-neutral fallback. This check fails the
  // build when a fallback is page-shaped and has children to cover, which is
  // the only combination that produces the flash.
  for (const file of walk(appDir)) {
    if (relative(appDir, file).split(sep).at(-1) !== 'loading.tsx') continue

    const dir = dirname(file)
    if (!hasChildRoutes(dir)) continue
    if (!isPageShapedFallback(readFileSync(file, 'utf8'))) continue

    fail(
      app,
      'page-shaped-loading-covers-children',
      `apps/${app}/src/app/${relative(appDir, file)}`
    )
  }

  // ---- 7. a segment fallback stacked on top of a route group's own ---------
  // Check 6 deliberately treats a route group as "the fix, not a child". That
  // is true for the group's *shape*, but not for its boundary: `loading.tsx`
  // wraps nested layouts, so a group is covered by the segment above it. When
  // both carry a fallback, one navigation paints two different ones in
  // sequence — the parent's first, then the group's, then the page.
  //
  // That is what put a 9-tab detail header in front of the apps *list*: the
  // segment fallback was written for `[slug]` and documented as covering
  // "everything except the list", an exception Next.js has no way to honour.
  //
  // The fix is to delete the segment fallback and let each leaf own its shape.
  // A detail layout only needs a boundary above it if it awaits data itself —
  // one that awaits `params` and streams the rest does not.
  //
  // Only a *page-shaped* parent fails here. Stacking a neutral fallback over a
  // group is a wasted paint, not a wrong one, and several of those neutral
  // parents are currently the only boundary above child pages that still await
  // at their top level — failing them would trade a grey flash for a hard
  // block. Give those children their own fallbacks first, then delete the
  // parent; this check is what stops a recognisable page going back on top.
  for (const file of walk(appDir)) {
    if (relative(appDir, file).split(sep).at(-1) !== 'loading.tsx') continue
    if (!isPageShapedFallback(readFileSync(file, 'utf8'))) continue

    const dir = dirname(file)
    for (const group of routeGroupsWithOwnLoading(dir)) {
      fail(
        app,
        'loading-stacked-over-route-group',
        `apps/${app}/src/app/${relative(appDir, file)} (also covers ${group}/loading.tsx)`
      )
    }
  }
}

/** Route-group children of `dir` that carry their own `loading.tsx`. */
function routeGroupsWithOwnLoading(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  return entries
    .filter((e) => e.isDirectory() && e.name.startsWith('('))
    .filter((e) => existsSync(join(dir, e.name, 'loading.tsx')))
    .map((e) => e.name)
}

/** Does this segment have a child route directory (excluding route groups)? */
function hasChildRoutes(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return false
  }

  return entries.some((e) => {
    if (!e.isDirectory()) return false
    if (e.name.startsWith('_') || e.name.startsWith('.')) return false
    // A route group is where the segment's own page now lives, so it is the
    // fix rather than a child that needs covering.
    if (e.name.startsWith('(')) return false
    return walk(join(dir, e.name)).some((f) => {
      const name = f.split(sep).at(-1)
      return name === 'page.tsx' || name === 'route.ts' || name === 'route.tsx'
    })
  })
}

/**
 * Does this fallback render a recognisable page rather than neutral filler?
 *
 * A full table, a page title, an entity header, or a named `*PageSkeleton` is
 * something the user can recognise as "the page I was just on" — or worse, as
 * a page they never asked for. That is exactly what must not flash. A bare
 * `<Skeleton>` block is neutral and allowed.
 *
 * `DetailHeaderSkeleton` belongs here: an avatar, a name and a tab strip read
 * unmistakably as a record's page. Leaving it out is why three segment
 * fallbacks shaped like detail headers sat above list route groups for months
 * without failing this check.
 */
function isPageShapedFallback(source) {
  return (
    /DataTableSkeleton/.test(source) ||
    /876-page-title/.test(source) ||
    /\bResourceToolbar\b/.test(source) ||
    /\bDetailHeaderSkeleton\b/.test(source) ||
    /\b\w*PageSkeleton\b/.test(source)
  )
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
