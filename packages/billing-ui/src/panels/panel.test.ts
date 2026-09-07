import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * A panel renders; it never resolves data. Type-only imports from a product
 * contract package are allowed — `shared-product-ui.md` permits a
 * `<product>-ui` package to use its own contract package for types, and an
 * `import type` is erased at compile time so it cannot fetch anything. A
 * *value* import from one of those packages is a real violation, because that
 * is how a client would get in.
 */
const SERVICE_PACKAGE = /^@876\/(billing|workspace|platform)(\/|$)/

/**
 * Walks each `import ... from '...'` statement individually. A single regex
 * cannot do this: these files use semicolon-less imports, so a lazy any-char
 * span happily runs from one import statement into a later one's specifier and
 * reports a type-only import as a value import.
 */
function valueImportsServicePackage(source: string): boolean {
  const statements = source.matchAll(
    /import\s+([\s\S]*?)\s*from\s+['"]([^'"]+)['"]/g
  )

  for (const [, clause, specifier] of statements) {
    if (!SERVICE_PACKAGE.test(specifier)) continue
    if (!/^type\b/.test(clause.trim())) return true
  }

  return false
}

const SERVER_ONLY_OR_FETCH = /server-only|\bfetch\s*\(/

function panelSources(): Array<[string, string]> {
  return readdirSync('src/panels')
    .filter((file) => file.endsWith('.tsx') || file === 'panel.ts')
    .map((file) => [file, readFileSync(`src/panels/${file}`, 'utf8')])
}

describe('panel contract', () => {
  it('keeps the three panel states discriminated', () => {
    const source = readFileSync('src/panels/panel.ts', 'utf8')
    expect(source).toContain("status: 'ready'")
    expect(source).toContain("status: 'empty'")
    expect(source).toContain("status: 'error'")
  })

  it('does not value-import a service client in any panel source', () => {
    for (const [file, source] of panelSources())
      expect(
        valueImportsServicePackage(source),
        `${file} value-imports a service package`
      ).toBe(false)
  })

  it('does not import server-only or call fetch in any panel source', () => {
    for (const [file, source] of panelSources())
      expect(
        SERVER_ONLY_OR_FETCH.test(source),
        `${file} imports server-only or calls fetch`
      ).toBe(false)
  })

  it('rejects a value import from a service package', () => {
    expect(
      valueImportsServicePackage(
        "import { createBilling } from '@876/billing'"
      )
    ).toBe(true)
  })

  it('allows a type-only import from a product contract package', () => {
    expect(
      valueImportsServicePackage(
        "import Link from 'next/link'\nimport type { CustomerContact } from '@876/billing'"
      )
    ).toBe(false)
  })

  it('still rejects a fetch call inside a panel', () => {
    expect(SERVER_ONLY_OR_FETCH.test('const rows = await fetch("/api/x")')).toBe(
      true
    )
  })
})
