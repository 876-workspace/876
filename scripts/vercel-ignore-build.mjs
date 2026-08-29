#!/usr/bin/env node
// Vercel "Ignored Build Step" gate for this monorepo.
//
// Usage (from an app's vercel.json):
//   "ignoreCommand": "node ../../scripts/vercel-ignore-build.mjs @876/console"
//
// Exit codes follow Vercel's contract:
//   0 -> skip the deployment
//   1 -> proceed with the deployment
//
// Deploy this app when a changed file belongs to it or to one of the workspaces
// it depends on. Two details are why this is a script rather than a path filter
// or a bare `turbo query affected`:
//
//   * A literal `apps/<name>/**` filter under-deploys. Most apps import
//     `@876/core` and `@876/ui`, so a change there must redeploy every dependent
//     or production silently serves stale code. The dependency graph, not the
//     directory, decides.
//   * `turbo query affected` over-deploys. A changed file that belongs to no
//     workspace is attributed to the root package, and every package depends on
//     the root — so one edited rule file under `.claude/` marks all thirteen
//     projects affected. Turbo is asked for the graph only; file ownership is
//     resolved here, after prose has been filtered out.
//
// Anything unexpected (no comparable base ref, a file in no workspace, a git or
// turbo failure) deploys. A wasted build is cheap; a silently skipped one ships
// stale code.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SKIP = 0
const DEPLOY = 1

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)

/** Paths that cannot change a build output, wherever they appear. */
const BUILD_IRRELEVANT = [
  /^docs\//,
  /^tests\//,
  /^\.claude\//,
  /^\.agents\//,
  /^\.grok\//,
  /^\.github\//,
  /^\.vscode\//,
  /^\.idea\//,
  /(^|\/)[^/]+\.mdx?$/i,
  /(^|\/)LICENSE$/,
  /(^|\/)\.gitignore$/,
  /(^|\/)\.gitattributes$/,
  /(^|\/)\.prettierignore$/,
  /(^|\/)\.editorconfig$/,
  /^playwright\.config\.ts$/,
]

const log = (message) => process.stderr.write(`[vercel-ignore] ${message}\n`)

const git = (args) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()

function resolvable(ref) {
  if (!ref) return false
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
    return true
  } catch {
    return false
  }
}

function finish(code, reason) {
  log(reason)
  log(code === SKIP ? 'skipping deployment' : 'proceeding with deployment')
  process.exit(code)
}

const workspace = process.argv[2]
if (!workspace)
  finish(DEPLOY, 'no workspace name passed — cannot scope the check')

// Vercel exposes the SHA of this project's last successful deployment. It is the
// right base: it spans every commit that has not reached this app yet, not just
// the newest one. It is absent on a first deploy and can fall outside a shallow
// clone, so the previous commit stands in.
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA
let base
if (resolvable(previousSha)) {
  base = previousSha
  log(`base: VERCEL_GIT_PREVIOUS_SHA (${previousSha.slice(0, 8)})`)
} else if (resolvable('HEAD^')) {
  if (previousSha)
    log(
      `VERCEL_GIT_PREVIOUS_SHA ${previousSha.slice(0, 8)} is not in this clone`
    )
  base = 'HEAD^'
  log('base: HEAD^')
} else {
  finish(DEPLOY, 'no comparable base ref — cannot tell what changed')
}

let changed
try {
  changed = git(['diff', '--name-only', base, 'HEAD'])
    .split('\n')
    .filter(Boolean)
} catch (error) {
  finish(DEPLOY, `git diff against ${base} failed: ${error.message}`)
}

if (changed.length === 0) finish(SKIP, `no files changed since ${base}`)

const relevant = changed.filter(
  (file) => !BUILD_IRRELEVANT.some((pattern) => pattern.test(file))
)
if (relevant.length === 0)
  finish(
    SKIP,
    `all ${changed.length} changed file(s) are prose or editor config`
  )

log(
  `${relevant.length} of ${changed.length} changed file(s) could affect a build`
)

// One query for both halves: every workspace with its directory, and the
// transitive internal dependencies of the workspace being deployed. Turbo runs
// before `pnpm install`, so it is fetched at the version the repo pins.
const turboVersion = JSON.parse(
  readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
).devDependencies?.turbo
const query = `query {
  all: packages { items { name path } }
  target: packages(filter: { equal: { field: NAME, value: "${workspace}" } }) {
    items { name allDependencies { items { name } } }
  }
}`

let result
try {
  const raw = execFileSync(
    'npx',
    ['--yes', turboVersion ? `turbo@${turboVersion}` : 'turbo', 'query', query],
    { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  )
  result = JSON.parse(raw.slice(raw.indexOf('{')))
} catch (error) {
  finish(DEPLOY, `turbo query failed: ${error.message}`)
}

const target = result?.data?.target?.items?.[0]
if (!target)
  finish(DEPLOY, `turbo does not know a workspace named ${workspace}`)

// The root package ("//", path "") is deliberately dropped: everything depends
// on it, so keeping it would make every root-level file a global trigger again.
const scope = new Set([
  target.name,
  ...target.allDependencies.items.map((item) => item.name),
])
scope.delete('//')

const workspaceDirs = (result.data.all.items ?? [])
  .filter((item) => item.path)
  .map((item) => ({ name: item.name, prefix: `${item.path}/` }))
  .sort((a, b) => b.prefix.length - a.prefix.length)

const touched = new Set()
for (const file of relevant) {
  const owner = workspaceDirs.find((dir) => file.startsWith(dir.prefix))
  if (!owner)
    finish(
      DEPLOY,
      `${file} belongs to no workspace — treating it as a global change`
    )
  touched.add(owner.name)
}

const hits = [...touched].filter((name) => scope.has(name))
if (hits.length === 0)
  finish(
    SKIP,
    `${workspace} does not depend on ${[...touched].sort().join(', ')}`
  )

finish(
  DEPLOY,
  `${workspace} depends on changed workspace(s): ${hits.sort().join(', ')}`
)
