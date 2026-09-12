import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { invoicePermissionCatalog } from '@876/core/access/catalogs'
import {
  createSourceFile,
  forEachChild,
  isCallExpression,
  isIdentifier,
  isStringLiteral,
  ScriptTarget,
  type Node,
} from 'typescript'
import { describe, expect, it } from 'vitest'

type FoundPermissionKey = {
  file: string
  key: string
}

const APP_ROOT = resolve(process.cwd())
const SOURCE_ROOT = join(APP_ROOT, 'src')

describe('Invoice app-access permission keys', () => {
  it('extracts literal requireAppPermission keys', () => {
    const found = extractPermissionKeys(
      "requireAppPermission('invoices.edit')",
      'page.tsx'
    )

    expect(found).toEqual([{ file: 'page.tsx', key: 'invoices.edit' }])
  })

  it('extracts literal canAccess keys', () => {
    const found = extractPermissionKeys(
      "canAccess(access.context, 'payments.create')",
      'page.tsx'
    )

    expect(found).toEqual([{ file: 'page.tsx', key: 'payments.create' }])
  })

  it('ignores dynamic keys and unrelated calls', () => {
    const found = extractPermissionKeys(
      [
        'requireAppPermission(permission)',
        'canAccess(access.context, permission)',
        "requireFinancePermission('sales:write')",
      ].join('\n'),
      'page.tsx'
    )

    expect(found).toEqual([])
  })

  it('finds app-access permission keys in the source tree', () => {
    const found = scanInvoiceSource()

    expect(found.length).toBeGreaterThan(5)
  })

  it('keeps every scanned key in the Invoice permission catalog', () => {
    const catalogKeys = new Set(
      invoicePermissionCatalog.permissions.map(({ key }) => key)
    )
    const invalid = scanInvoiceSource().filter(
      ({ key }) => !catalogKeys.has(key)
    )

    expect(invalid, formatOffendingKeys(invalid)).toEqual([])
  })

  it('keeps finance colon keys out of app-access calls', () => {
    const invalid = scanInvoiceSource().filter(({ key }) => key.includes(':'))

    expect(invalid, formatOffendingKeys(invalid)).toEqual([])
  })
})

function scanInvoiceSource(): FoundPermissionKey[] {
  return findSourceFiles(SOURCE_ROOT).flatMap((path) =>
    extractPermissionKeys(readFileSync(path, 'utf8'), relative(APP_ROOT, path))
  )
}

function findSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') return []
      return findSourceFiles(path)
    }

    if (!/\.(?:ts|tsx)$/.test(entry.name) || /\.test\.[^.]+$/.test(entry.name))
      return []

    return [path]
  })
}

function extractPermissionKeys(
  source: string,
  file: string
): FoundPermissionKey[] {
  const sourceFile = createSourceFile(file, source, ScriptTarget.Latest, true)
  const found: FoundPermissionKey[] = []

  function visit(node: Node): void {
    if (isCallExpression(node) && isIdentifier(node.expression)) {
      const argumentIndex =
        node.expression.text === 'requireAppPermission'
          ? 0
          : node.expression.text === 'canAccess'
            ? 1
            : null
      const argument =
        argumentIndex === null ? null : node.arguments[argumentIndex]

      if (argument && isStringLiteral(argument))
        found.push({ file, key: argument.text })
    }

    forEachChild(node, visit)
  }

  visit(sourceFile)

  return found
}

function formatOffendingKeys(keys: FoundPermissionKey[]): string {
  return keys.map(({ file, key }) => `${key} in ${file}`).join(', ')
}
