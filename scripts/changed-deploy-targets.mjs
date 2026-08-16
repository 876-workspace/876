#!/usr/bin/env node
// Decide which deploy targets a change actually affects, using the real
// workspace dependency graph instead of a blanket `packages/**` path filter.
//
// The blanket filter had exactly two failure modes and no middle ground:
// include it and one edit to any shared package redeploys all eleven Workers;
// drop it and a fix in `@876/ui` merges green while every app keeps serving
// the old bundle. Neither is acceptable, so resolve each app's transitive
// workspace dependencies and match changed files against only those.
//
// Usage:  node scripts/changed-deploy-targets.mjs <base-sha> <head-sha>
// Writes `<target>=true|false` lines to $GITHUB_OUTPUT (and stdout).

import { execFileSync } from 'node:child_process'
import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Deploy target name (the workflow job / dispatch input) → workspace package.
const TARGETS = {
  'widgets-api': '@876/widgets-api',
  api: '@876/api',
  'couriers-api': '@876/couriers-api',
  'billing-api': '@876/billing-api',
  'storage-api': '@876/storage-api',
  console: '@876/console',
  billing: '@876/billing-app',
  invoice: '@876/invoice-app',
  couriers: '@876/couriers-app',
  enterprise: '@876/enterprise',
  app: '@876/app',
}

// Containers build from the repository root, so these files change the image
// without touching the app directory.
const IMAGE_TARGETS = new Set(['api', 'couriers-api', 'billing-api'])
const IMAGE_PATHS = ['.dockerignore']

// A change to any of these redeploys everything: the dependency graph cannot
// see them, but they change what every build produces.
const GLOBAL_PATHS = [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.github/workflows/deploy-cloudflare.yml',
  '.github/actions/setup/action.yml',
  'scripts/changed-deploy-targets.mjs',
]

const root = process.cwd()

/** Every workspace package: name → { dir, deps }. */
function readWorkspace() {
  const raw = execFileSync('pnpm', ['list', '-r', '--depth', '-1', '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })

  const packages = new Map()

  for (const entry of JSON.parse(raw)) {
    if (!entry.name || !entry.path) continue

    const manifestPath = join(entry.path, 'package.json')
    if (!existsSync(manifestPath)) continue

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const deps = Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    })

    packages.set(entry.name, {
      dir: relative(root, entry.path) || '.',
      deps,
    })
  }

  return packages
}

/** The package plus every workspace package it depends on, transitively. */
function closure(packages, name) {
  const seen = new Set()
  const queue = [name]

  while (queue.length > 0) {
    const current = queue.pop()
    if (seen.has(current)) continue

    const pkg = packages.get(current)
    if (!pkg) continue // an external npm dependency — the lockfile covers it

    seen.add(current)
    queue.push(...pkg.deps)
  }

  return [...seen].map((n) => packages.get(n).dir)
}

function changedFiles(base, head) {
  const raw = execFileSync(
    'git',
    ['diff', '--name-only', `${base}...${head}`],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }
  )

  return raw.split('\n').filter(Boolean)
}

function isUnder(file, dir) {
  if (dir === '.') return true
  return (
    file === dir || file.startsWith(dir + sep) || file.startsWith(dir + '/')
  )
}

const [, , base, head = 'HEAD'] = process.argv
if (!base) {
  console.error('usage: changed-deploy-targets.mjs <base-sha> [head-sha]')
  process.exit(2)
}

const packages = readWorkspace()

// A base we cannot resolve — a first push, a force push, a shallow clone —
// tells us nothing about what changed, so deploy everything rather than
// silently skipping. Failing safe here is the whole point of the change.
let files
let unresolvedBase = false
try {
  files = changedFiles(base, head)
} catch {
  console.error(`cannot resolve ${base}...${head}; treating as a full deploy`)
  files = []
  unresolvedBase = true
}

const globalChange =
  unresolvedBase || files.some((f) => GLOBAL_PATHS.includes(f))

const lines = []

for (const [target, pkgName] of Object.entries(TARGETS)) {
  if (!packages.has(pkgName))
    throw new Error(
      `deploy target "${target}" names unknown package ${pkgName}`
    )

  const dirs = closure(packages, pkgName)
  const imagePaths = IMAGE_TARGETS.has(target) ? IMAGE_PATHS : []

  const affected =
    globalChange ||
    files.some(
      (f) => imagePaths.includes(f) || dirs.some((dir) => isUnder(f, dir))
    )

  lines.push(`${target}=${affected}`)
}

const output = lines.join('\n') + '\n'
console.log(output.trim())

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output)
