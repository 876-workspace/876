#!/usr/bin/env node
/**
 * Audit page metadata ownership for private 876 Next.js app surfaces.
 *
 * This intentionally checks ownership, not SEO completeness. Canonical pages
 * should own a local title through `metadata`, `generateMetadata`, or a metadata
 * re-export. Parallel slots, redirect-only aliases, and list/detail selector
 * pages are documented exceptions because their canonical destination/layout
 * owns the title.
 *
 * Usage:
 *   node scripts/check-page-metadata.mjs
 *   node scripts/check-page-metadata.mjs console billing invoice
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DEFAULT_APPS = ['console', 'billing', 'invoice']
const APPS = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_APPS

const EXCEPTIONS = new Map([
  [
    'console:src/app/(app)/dashboard/page.tsx',
    'redirect-only route; destination owns metadata',
  ],
  [
    'console:src/app/(app)/widgets/notes/page.tsx',
    'legacy redirect to /widgets/notepad',
  ],
  [
    'console:src/app/(app)/widgets/notes/[...path]/page.tsx',
    'legacy redirect to the matching /widgets/notepad subroute',
  ],
  [
    'billing:src/app/(app)/(sales)/invoices/[invoiceId]/lines/page.tsx',
    'redirect-only compatibility route; invoice destination owns metadata',
  ],
  [
    'billing:src/app/(app)/settings/users/(list)/page.tsx',
    'null list/detail selector; shared route layout owns section metadata',
  ],
  [
    'billing:src/app/(app)/settings/roles/(list)/page.tsx',
    'null list/detail selector; shared route layout owns section metadata',
  ],
  [
    'invoice:src/app/(app)/settings/finance/page.tsx',
    'permission-driven redirect; destination owns metadata',
  ],
  [
    'invoice:src/app/(app)/settings/users/(list)/page.tsx',
    'null list/detail selector; shared route layout owns section metadata',
  ],
  [
    'invoice:src/app/(app)/settings/roles/(list)/page.tsx',
    'null list/detail selector; shared route layout owns section metadata',
  ],
])

const failures = []
const exceptions = []
let checked = 0

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walk(full, out)
      continue
    }
    if (entry.name === 'page.tsx') out.push(full)
  }
  return out
}

function normalize(path) {
  return path.split(sep).join('/')
}

function ownsMetadata(source) {
  return (
    /\bexport\s+const\s+metadata\b/.test(source) ||
    /\bexport\s+(?:async\s+)?function\s+generateMetadata\b/.test(source) ||
    /\bexport\s*\{[^}]*\b(?:metadata|generateMetadata)\b[^}]*\}/s.test(source)
  )
}

function parallelSlotReason(relativePath) {
  const segments = relativePath.split('/')
  const slot = segments.find((segment) => segment.startsWith('@'))
  return slot ? `parallel route slot (${slot}); canonical route owns metadata` : null
}

for (const app of APPS) {
  const appRoot = join('apps', app)
  const routeRoot = join(appRoot, 'src', 'app')

  if (!existsSync(routeRoot)) {
    failures.push(`${app}: route root does not exist: ${routeRoot}`)
    continue
  }

  for (const page of walk(routeRoot)) {
    checked += 1
    const relativePath = normalize(relative(appRoot, page))
    const source = readFileSync(page, 'utf8')

    if (ownsMetadata(source)) continue

    const slotReason = parallelSlotReason(relativePath)
    if (slotReason) {
      exceptions.push({ app, path: relativePath, reason: slotReason })
      continue
    }

    const key = `${app}:${relativePath}`
    const reason = EXCEPTIONS.get(key)
    if (reason) {
      exceptions.push({ app, path: relativePath, reason })
      continue
    }

    failures.push(`${app}:${relativePath}`)
  }
}

console.log(`Page metadata audit: ${checked} page routes checked.`)
console.log(`Documented inherited/redirect exceptions: ${exceptions.length}.`)

for (const exception of exceptions) {
  console.log(`  EXEMPT ${exception.app}:${exception.path} — ${exception.reason}`)
}

if (failures.length) {
  console.error('\nPages without metadata ownership or a documented exception:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exitCode = 1
} else {
  console.log('\nPage metadata ownership is complete.')
}
