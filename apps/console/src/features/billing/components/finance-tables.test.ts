import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Console renders the shared finance tables from server pages, and the shared
 * tables take `formatAmount`/`formatDate` callbacks. A function cannot cross
 * the RSC boundary, so a server module importing one of those tables directly
 * throws at request time — "Functions cannot be passed directly to Client
 * Components" — with nothing at build or typecheck time to catch it.
 *
 * `finance-tables.tsx` is the one client module allowed to hold that binding.
 */

const CONSOLE_SRC = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/** The shared tables that take a formatter callback. */
const CALLBACK_TABLES = [
  '@876/billing-ui/customers-table',
  '@876/billing-ui/invoices-table',
  '@876/billing-ui/items-table',
  '@876/billing-ui/payments-table',
]

const BINDING_MODULE = join(
  CONSOLE_SRC,
  'features/billing/components/finance-tables.tsx'
)

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory())
      return entry.name === 'node_modules' ? [] : sourceFiles(path)

    return /\.tsx?$/.test(entry.name) && statSync(path).isFile() ? [path] : []
  })
}

describe('the shared finance tables', () => {
  it('are imported for value only through the client binding module', () => {
    const offenders = sourceFiles(CONSOLE_SRC).filter((path) => {
      if (path === BINDING_MODULE) return false

      const source = readFileSync(path, 'utf8')
      return CALLBACK_TABLES.some((table) =>
        // A `import type { … }` line is erased at build time and cannot pass a
        // prop, so the row-shape imports the mappers need stay legal.
        new RegExp(`^import (?!type )[^\\n]*from '${table}'`, 'm').test(source)
      )
    })

    expect(
      offenders.map((path) => relative(CONSOLE_SRC, path)),
      'Import these from @/features/billing/components/finance-tables instead: the shared table takes a formatter callback, which a server component cannot pass.'
    ).toEqual([])
  })

  it('are all bound by the module that owns the formatters', () => {
    const binding = readFileSync(BINDING_MODULE, 'utf8')

    expect(binding.startsWith("'use client'")).toBe(true)
    for (const table of CALLBACK_TABLES)
      expect(binding).toContain(`from '${table}'`)
  })
})
