#!/usr/bin/env node
/**
 * Registered error contract check.
 *
 * Fails on hand-built public error construction inside zones that have been
 * migrated to registry-owned errors, so the literal-error pattern cannot
 * return. Legacy zones (core/billing module interiors, BFF user-facing copy)
 * are reported as inventory counts for burn-down, not failures.
 *
 * Usage: node scripts/check-error-contract.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.vercel',
  '.turbo',
  'dist',
  '.venv',
  '__pycache__',
  '.git',
  'generated',
])

const SKIP_SUFFIXES = ['.test.ts', '.test.tsx', '.test.py', '.test.mjs']

/** Paths whose non-canonical shapes are defined by external protocols. */
const PROTOCOL_PATHS = [
  'modules/oauth/',
  'modules/twilio-webhooks/',
  'modules/workos-webhooks/',
  'providers/',
  'platform/phone.ts',
  'platform/rate-limit.ts',
]

/**
 * [pattern, roots, description]. A match outside PROTOCOL_PATHS fails the run.
 * These zones are migrated: any hand-built construction here is a regression.
 */
const ERROR_RULES = [
  [
    /res\.status\(\d+\)\.json\(\{\s*data:\s*null,\s*error:\s*\{\s*code:/,
    [
      'apps/commerce-api/src',
      'apps/crm-api/src/http',
      'apps/projects-api/src/http',
      'apps/couriers-api/src/http/middleware',
      'apps/work-api/src/http',
    ],
    'hand-built error envelope (resolve a registered definition instead)',
  ],
  [
    /throw new WorkHttpError/,
    ['apps/work-api/src'],
    'expected-failure throw (return a registered error value instead)',
  ],
  [
    /AppHTTPException\(\s*code=[^)]*message=/s,
    ['apps/storage-api'],
    'AppHTTPException with inline message (pass only the registered code)',
  ],
  [
    /return _error\(\s*"[^"]+",/s,
    ['apps/storage-api/domains'],
    'domain _error with inline message/status (pass only the registered code)',
  ],
  [
    /\berr\('[^']*',\s*\d/,
    ['apps/widgets-api/src'],
    'ServiceErr with inline message/status (pass only the registered Widgets code)',
  ],
  [
    /apiError\('[^']*',\s*\{/,
    ['apps/widgets-api/src', 'apps/couriers/src/app/api'],
    'string-literal apiError (resolve a registered definition instead)',
  ],
  [
    /['"]error\/http['"]/,
    ['apps/api/src', 'apps/billing-api/src'],
    'unregistered error/http code (use the registered error/unknown)',
  ],
]

/** Legacy zones: counted for burn-down visibility, never failing. */
const INVENTORY_RULES = [
  [
    /new AppHttpError\(\{/,
    ['apps/api/src', 'apps/billing-api/src', 'apps/couriers-api/src'],
    'direct AppHttpError constructions (whole-service migration follow-up)',
  ],
  [
    /appError\([^)]*,\s*\{[^}]*\b(message|httpStatus)\b/,
    ['apps/api/src', 'apps/billing-api/src'],
    'appError with message/httpStatus overrides',
  ],
  [
    /apiError\('[^']*',\s*\{/,
    [
      'apps/billing/src/app/api',
      'apps/console/src/app/api',
      'apps/crm/src/app/api',
      'apps/invoice/src/app/api',
    ],
    'BFF string-literal apiError (per-app normalization follow-up)',
  ],
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|py|mjs)$/.test(entry)) out.push(full)
  }
  return out
}

function isTestFile(file) {
  return SKIP_SUFFIXES.some((suffix) => file.endsWith(suffix))
}

function isProtocolPath(file) {
  const rel = relative(ROOT, file)
  return PROTOCOL_PATHS.some((fragment) => rel.includes(fragment))
}

function scan(rules) {
  const hits = []
  for (const [source, roots, description] of rules) {
    const pattern = new RegExp(source.source, 'gs')
    for (const root of roots) {
      const abs = join(ROOT, root)
      let files = []
      try {
        files = walk(abs)
      } catch {
        continue
      }
      for (const file of files) {
        if (isTestFile(file) || isProtocolPath(file)) continue
        const content = readFileSync(file, 'utf8')
        for (const match of content.matchAll(pattern)) {
          const line = content.slice(0, match.index).split('\n').length
          hits.push({
            file: relative(ROOT, file),
            line,
            description,
          })
        }
      }
    }
  }
  return hits
}

function main() {
  const errors = scan(ERROR_RULES)
  const inventory = scan(INVENTORY_RULES)

  console.log('error-contract inventory (legacy zones, non-failing):')
  for (const [, roots, description] of INVENTORY_RULES) {
    const count = inventory.filter(
      (hit) => hit.description === description
    ).length
    console.log(`  ${count}  ${description}  [${roots.join(', ')}]`)
  }

  if (errors.length > 0) {
    console.error('\nerror-contract violations in migrated zones:')
    for (const hit of errors)
      console.error(`  ${hit.file}:${hit.line}  ${hit.description}`)
    process.exit(1)
  }

  console.log('\nerror-contract check passed.')
}

main()
