#!/usr/bin/env node
/**
 * The `any` budget gate: a ratchet that can only fall.
 *
 * Counts the `any` type in non-test source per workspace (`apps/<name>/src`
 * and `packages/<name>/src`) and compares each count against
 * `scripts/any-budget.json`. A workspace over its budget fails the run.
 *
 * A workspace absent from the budget file gets a budget of 0, which is the
 * default every new workspace starts with.
 *
 * Usage:
 *   node scripts/check-any-budget.mjs            # check current tree
 *   node scripts/check-any-budget.mjs --update   # lower fallen budgets in place
 *
 * `--update` only moves numbers down. A workspace that grew keeps its old
 * number, is named in the output, and the run exits 1. Raising a budget
 * requires a human editing the JSON, which is the review moment.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = dirname(HERE)
const BUDGET_PATH = join(HERE, 'any-budget.json')

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
])

/** Directory segments that are never scanned, wherever they appear. */
const EXCLUDED_DIR_SEGMENTS = new Set([
  'node_modules',
  'dist',
  '.next',
  '__tests__',
  'generated',
])

const ANY_WORD = /\bany\b/g

/**
 * Significant characters that can sit directly beside the `any` token (after
 * blanking whitespace) when it is used as a type. JSX copy such as
 * "keep any unused amount" has identifier characters on both sides instead.
 */
const PREV_TYPE_CHARS = new Set([
  ':',
  '<',
  '(',
  ',',
  '[',
  '|',
  '&',
  '=',
  '?',
  '{',
  '!',
  '*',
])
const NEXT_TYPE_CHARS = new Set([
  ')',
  '>',
  ',',
  ';',
  ']',
  '[',
  '|',
  '&',
  '?',
  '=',
  '{',
  '}',
])
/** Keywords after which a bare token is a type: cast, extends, satisfies, keyof. */
const PREV_TYPE_WORDS = new Set(['as', 'extends', 'satisfies', 'keyof'])

/**
 * True when the `any` token at `index` in stripped source sits in type
 * position. Neighbour whitespace (including newlines) is skipped, so
 * multi-line signatures still match.
 */
export function isTypePosition(stripped, index) {
  const before = stripped.slice(0, index).replace(/\s+$/, '')
  const after = stripped.slice(index + 3).replace(/^\s+/, '')
  const prev = before.slice(-1)
  const next = after.slice(0, 1)
  if (prev !== '' && PREV_TYPE_CHARS.has(prev)) return true
  if (next !== '' && NEXT_TYPE_CHARS.has(next)) return true
  const word = (before.match(/[A-Za-z0-9_$]+$/) || [''])[0]
  return PREV_TYPE_WORDS.has(word)
}

/**
 * Blank out line comments, block comments, and string literals, preserving
 * newlines so line numbers derived from the result stay honest.
 *
 * Template-literal interpolations (`${ ... }`) are real code, so their
 * contents are kept while the surrounding string text is blanked. Escapes
 * (including escaped newlines) are honoured in every string mode.
 */
export function stripCommentsAndStrings(source) {
  const len = source.length
  let out = ''
  let i = 0
  // Mode stack; the bottom is always 'code'. Template interpolations push a
  // fresh 'code' frame so nested templates and braces track correctly.
  const modes = ['code']
  // Brace depth for each template-interpolation 'code' frame on the stack.
  const depths = []
  const top = () => modes[modes.length - 1]

  // Blank `n` source chars, keeping newlines so line numbers stay honest.
  const blank = (n) => {
    for (let k = 0; k < n; k += 1) {
      const ch = source[i + k]
      out += ch === '\n' ? '\n' : ' '
    }
    i += n
  }

  while (i < len) {
    const c = source[i]
    const nx = i + 1 < len ? source[i + 1] : ''
    const mode = top()

    if (mode === 'line') {
      if (c === '\n') {
        modes.pop()
        out += c
        i += 1
      } else {
        blank(1)
      }
      continue
    }

    if (mode === 'block') {
      if (c === '*' && nx === '/') {
        blank(2)
        modes.pop()
      } else {
        blank(1)
      }
      continue
    }

    if (mode === 'sq' || mode === 'dq') {
      const quote = mode === 'sq' ? "'" : '"'
      if (c === '\\' && i + 1 < len) {
        blank(source[i + 1] === '\n' ? 1 : 2)
        if (source[i] === '\n') {
          // A backslash-newline was partially blanked above; the newline
          // itself is still ahead, so keep it visible for line counting.
          out += '\n'
          i += 1
        }
      } else if (c === '\n') {
        // Unterminated literal: bail back to code on the next line rather
        // than swallowing the rest of the file.
        modes.pop()
        out += c
        i += 1
      } else if (c === quote) {
        blank(1)
        modes.pop()
      } else {
        blank(1)
      }
      continue
    }

    if (mode === 'tpl') {
      if (c === '\\' && i + 1 < len) {
        if (source[i + 1] === '\n') {
          blank(1)
          out += '\n'
          i += 1
        } else {
          blank(2)
        }
      } else if (c === '`') {
        blank(1)
        modes.pop()
      } else if (c === '$' && nx === '{') {
        blank(2)
        modes.push('code')
        depths.push(1)
      } else if (c === '\n') {
        out += c
        i += 1
      } else {
        blank(1)
      }
      continue
    }

    // mode === 'code'
    if (c === '/' && nx === '/') {
      blank(2)
      modes.push('line')
    } else if (c === '/' && nx === '*') {
      blank(2)
      modes.push('block')
    } else if (c === "'") {
      blank(1)
      modes.push('sq')
    } else if (c === '"') {
      blank(1)
      modes.push('dq')
    } else if (c === '`') {
      blank(1)
      modes.push('tpl')
    } else if (c === '{') {
      if (depths.length > 0) depths[depths.length - 1] += 1
      out += c
      i += 1
    } else if (c === '}') {
      if (depths.length > 0) {
        depths[depths.length - 1] -= 1
        if (depths[depths.length - 1] === 0) {
          depths.pop()
          modes.pop()
          blank(1)
          continue
        }
      }
      out += c
      i += 1
    } else {
      out += c
      i += 1
    }
  }

  return out
}

/**
 * Count `any` used as a type token in one source string.
 * Returns the count plus the 1-based line of every occurrence.
 *
 * Matching runs in two stages: comments and string literals are blanked
 * first (so prose, `'all' | 'any'` enums, and commented code never match),
 * then a token counts only in type position — beside type punctuation such
 * as `: < ( , | & = ? { ! *` / `) > , ; ] [ | & ? = { }`, or after `as`,
 * `extends`, `satisfies`, or `keyof`. JSX copy ("keep any unused amount")
 * therefore stays out of the budget.
 */
export function countAnyOccurrences(source) {
  const stripped = stripCommentsAndStrings(source)
  // Line-start offsets so each match maps to a line in O(log n).
  const starts = [0]
  for (let k = 0; k < stripped.length; k += 1) {
    if (stripped[k] === '\n') starts.push(k + 1)
  }
  const lineOf = (index) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= index) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
  const lines = []
  for (const match of stripped.matchAll(ANY_WORD)) {
    if (match.index === undefined) continue
    if (!isTypePosition(stripped, match.index)) continue
    lines.push(lineOf(match.index))
  }
  return { count: lines.length, lines }
}

/** True when a path relative to a workspace `src/` dir must not be scanned. */
export function isExcludedSourcePath(relPath) {
  const segments = relPath.split('/')
  if (segments.some((s) => EXCLUDED_DIR_SEGMENTS.has(s))) return true
  const base = segments[segments.length - 1]
  if (/\.(test|spec)\.[cm]?[tj]sx?$/.test(base)) return true
  if (/\.generated\.[cm]?[tj]sx?$/.test(base)) return true
  const dot = base.lastIndexOf('.')
  if (dot === -1) return true
  return !SOURCE_EXTENSIONS.has(base.slice(dot))
}

/** Absolute source files under `srcDir` that the gate scans. */
export function collectSourceFiles(srcDir) {
  const out = []
  const walk = (dir) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile()) {
        const rel = relative(srcDir, full).split(sep).join('/')
        if (!isExcludedSourcePath(rel)) out.push(full)
      }
    }
  }
  walk(srcDir)
  return out.sort()
}

/**
 * Scan one workspace `src/` dir. `displayPrefix` is the `apps/<name>` or
 * `packages/<name>` label used in reports. Returns the total plus every
 * occurrence location, sorted by file then line.
 */
export function scanWorkspaceDir(srcDir, displayPrefix) {
  const occurrences = []
  for (const file of collectSourceFiles(srcDir)) {
    const { lines } = countAnyOccurrences(readFileSync(file, 'utf8'))
    for (const line of lines) {
      occurrences.push({
        file: `${displayPrefix}/src/${relative(srcDir, file).split(sep).join('/')}`,
        line,
      })
    }
  }
  occurrences.sort((a, b) =>
    a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line
  )
  return {
    workspace: displayPrefix,
    count: occurrences.length,
    occurrences,
  }
}

/** Discover every `apps/<name>` and `packages/<name>` workspace with a src dir. */
export function discoverWorkspaces(repoRoot = REPO_ROOT) {
  const found = []
  for (const area of ['apps', 'packages']) {
    let entries
    try {
      entries = readdirSync(join(repoRoot, area), { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const srcDir = join(repoRoot, area, entry.name, 'src')
      if (!existsSync(srcDir)) continue
      found.push({ name: `${area}/${entry.name}`, srcDir })
    }
  }
  found.sort((a, b) => (a.name < b.name ? -1 : 1))
  return found
}

/** Scan every workspace. Returns one row per workspace, sorted by name. */
export function scanAllWorkspaces(repoRoot = REPO_ROOT) {
  return discoverWorkspaces(repoRoot).map(({ name, srcDir }) =>
    scanWorkspaceDir(srcDir, name)
  )
}

/** Read the budget file. A missing or unreadable file means every budget is 0. */
export function loadBudget(budgetPath = BUDGET_PATH) {
  try {
    return JSON.parse(readFileSync(budgetPath, 'utf8'))
  } catch {
    return {}
  }
}

/** The budget for one workspace. Absent entries default to 0. */
export function budgetFor(budget, workspace) {
  const value = budget[workspace]
  return typeof value === 'number' ? value : 0
}

/**
 * Compare scan rows against the budget. Returns per-workspace rows plus the
 * subset over budget. `delta` is current minus budget (negative is headroom).
 */
export function evaluateCounts(scanned, budget) {
  const rows = scanned.map((row) => {
    const allowed = budgetFor(budget, row.workspace)
    return {
      workspace: row.workspace,
      current: row.count,
      budget: allowed,
      delta: row.count - allowed,
      over: row.count > allowed,
      occurrences: row.occurrences,
    }
  })
  return { rows, overBudget: rows.filter((r) => r.over) }
}

/**
 * Pure `--update` computation: the next budget only moves down. Workspaces
 * that grew keep their old number and are listed in `refusals`; fallen
 * budgets are listed in `lowered`; zero-count workspaces are dropped (absent
 * already means 0). Budget entries for vanished workspaces are dropped too.
 */
export function computeUpdatedBudget(scanned, budget) {
  const next = {}
  const lowered = []
  const refusals = []
  for (const row of scanned) {
    const oldValue = budget[row.workspace]
    const oldBudget = typeof oldValue === 'number' ? oldValue : 0
    const isKnown = typeof oldValue === 'number'
    if (row.count > oldBudget) {
      if (isKnown) next[row.workspace] = oldBudget
      refusals.push({
        workspace: row.workspace,
        current: row.count,
        budget: oldBudget,
      })
    } else {
      if (row.count > 0) next[row.workspace] = row.count
      if (isKnown && row.count < oldBudget) {
        lowered.push({
          workspace: row.workspace,
          from: oldBudget,
          to: row.count,
        })
      }
    }
  }
  return { next, lowered, refusals }
}

function pad(value, width) {
  return String(value).padEnd(width, ' ')
}

function printTable(rows) {
  const nameWidth = Math.max(
    'workspace'.length,
    ...rows.map((r) => r.workspace.length)
  )
  console.log(
    `  ${pad('workspace', nameWidth)}  current  budget  delta  status`
  )
  for (const row of rows) {
    const status = row.over ? 'OVER' : 'ok'
    console.log(
      `  ${pad(row.workspace, nameWidth)}  ${pad(row.current, 7)}  ${pad(row.budget, 6)}  ${pad(row.delta > 0 ? `+${row.delta}` : row.delta, 5)}  ${status}`
    )
  }
}

function runCheck() {
  const scanned = scanAllWorkspaces()
  const budget = loadBudget()
  const { rows, overBudget } = evaluateCounts(scanned, budget)
  const total = rows.reduce((n, r) => n + r.current, 0)

  console.log(
    `any-budget: ${total} occurrence(s) across ${rows.length} workspace(s)`
  )
  printTable(rows)

  if (overBudget.length === 0) {
    console.log('any-budget: OK')
    return 0
  }

  console.error(`\nany-budget: ${overBudget.length} workspace(s) over budget`)
  for (const row of overBudget) {
    console.error(
      `  ${row.workspace}: ${row.current} > ${row.budget} (over by ${row.delta})`
    )
    const shown = row.occurrences.slice(0, 50)
    for (const occ of shown) console.error(`    - ${occ.file}:${occ.line}`)
    if (row.occurrences.length > shown.length) {
      console.error(
        `    - ... and ${row.occurrences.length - shown.length} more`
      )
    }
  }
  console.error(
    '\nLower the counts or have a human raise scripts/any-budget.json'
  )
  return 1
}

function runUpdate() {
  const scanned = scanAllWorkspaces()
  const budget = loadBudget()
  const { next, lowered, refusals } = computeUpdatedBudget(scanned, budget)

  const sorted = Object.fromEntries(
    Object.entries(next).sort(([a], [b]) => (a < b ? -1 : 1))
  )
  writeFileSync(BUDGET_PATH, `${JSON.stringify(sorted, null, 2)}\n`)

  for (const l of lowered) {
    console.log(`any-budget: lowered ${l.workspace} ${l.from} -> ${l.to}`)
  }
  if (lowered.length === 0 && refusals.length === 0) {
    console.log('any-budget: baseline already matches the tree')
  }
  if (refusals.length > 0) {
    for (const r of refusals) {
      console.error(
        `any-budget: REFUSES to raise ${r.workspace} ${r.budget} -> ${r.current}; edit scripts/any-budget.json by hand`
      )
    }
    return 1
  }
  console.log('any-budget: baseline updated (down only)')
  return 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const code = process.argv.includes('--update') ? runUpdate() : runCheck()
  process.exit(code)
}
