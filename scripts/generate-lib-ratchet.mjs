#!/usr/bin/env node
/**
 * Regenerates `app-structure-lib-ratchet.json` from the current tree.
 *
 * The ratchet records loose `src/lib/` files that predate the closed set in
 * `check-app-structure.mjs` (check 8). Run this only to *shrink* the list after
 * moving files into directories — never to absorb a newly added loose file,
 * which is the review moment the gate exists to create.
 */
import { readdirSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const APPS = [
  'console', 'billing', 'couriers', '876', 'enterprise',
  'invoice', 'crm', 'projects', 'commerce',
]
const ALLOWED = new Set()  // nothing is allowed loose at the lib root

const out = {}
for (const app of APPS) {
  const dir = `apps/${app}/src/lib`
  try { statSync(dir) } catch { continue }
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => e.name)
    .filter((n) => !ALLOWED.has(n))
    .filter((n) => !ALLOWED.has(n.replace(/\.test\.tsx?$/, '.ts')))
    .sort()
  if (names.length) out[app] = names
}

writeFileSync(
  'scripts/app-structure-lib-ratchet.json',
  JSON.stringify(out, null, 2) + '\n'
)
const total = Object.values(out).reduce((n, v) => n + v.length, 0)
console.log(`lib ratchet: ${total} grandfathered file(s) across ${Object.keys(out).length} app(s)`)
