import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const API_ROOT = resolve(process.cwd(), 'src/app/api')

const CANONICAL_HELPERS =
  /\b(?:apiError|apiJson|apiSuccess|errorResponse|invalidRequest|resultResponse)\b/

describe('Couriers route envelopes', () => {
  const routeFiles = findRouteFiles(API_ROOT).filter(
    (path) => !path.endsWith('/health/route.ts')
  )

  it.each(routeFiles)('%s uses a canonical response helper', (path) => {
    const source = readFileSync(path, 'utf8')

    // A route may reach a canonical envelope through a named wrapper in its
    // own `_lib/`, which reads better at the call site than the raw helper.
    // Matching only the canonical names flagged such a route as a violation,
    // so follow one level into the wrapper that actually exports the symbol.
    expect(
      CANONICAL_HELPERS.test(source) || wrapperUsesCanonicalHelper(path, source)
    ).toBe(true)

    // These still apply to the route file itself: a wrapper never excuses a
    // route hand-rolling a response or smuggling an error through apiJson.
    expect(source).not.toMatch(/\b(?:NextResponse|Response)\.json\s*\(/)
    expect(source).not.toMatch(/\bapiJson\(\s*\{\s*error\s*:/)
  })
})

/**
 * True when a symbol the route imports from a sibling `_lib/` is exported by a
 * file that itself uses a canonical helper.
 *
 * Deliberately one level deep: a wrapper around a wrapper is indirection this
 * check should surface rather than follow.
 */
function wrapperUsesCanonicalHelper(routePath: string, source: string) {
  const imported = new Set<string>()
  const importFrom = /import\s*\{([^}]*)\}\s*from\s*'((?:\.\.?\/)+_lib\/[^']+)'/g

  const modules = new Set<string>()
  for (const match of source.matchAll(importFrom)) {
    modules.add(match[2])
    for (const name of match[1].split(',')) {
      const identifier = name.trim().split(/\s+as\s+/).pop()?.trim()
      if (identifier) imported.add(identifier)
    }
  }
  if (imported.size === 0) return false

  const routeDir = dirname(resolve(process.cwd(), routePath))

  return [...modules].some((specifier) => {
    const base = resolve(routeDir, specifier)
    const wrapper = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(
      (candidate) => existsSync(candidate)
    )
    if (!wrapper) return false

    const wrapperSource = readFileSync(wrapper, 'utf8')
    if (!CANONICAL_HELPERS.test(wrapperSource)) return false

    return [...imported].some((identifier) =>
      new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${identifier}\\b`).test(
        wrapperSource
      )
    )
  })
}

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findRouteFiles(path)

    return entry.name === 'route.ts' ? [relative(process.cwd(), path)] : []
  })
}
