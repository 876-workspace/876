import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const APP_ROOT = resolve(process.cwd())
const FINANCE_RESOURCES = [
  'bank-accounts',
  'customers',
  'invoices',
  'items',
  'payment-modes',
  'payments',
] as const

describe('Invoice app API boundary', () => {
  it('does not expose Billing service topology through rewrites or a gateway', () => {
    const config = readFileSync(join(APP_ROOT, 'next.config.ts'), 'utf8')

    expect(config).not.toContain("source: '/api/v1/:path*'")
    expect(config).not.toContain("destination: '/api/billing-gateway/:path*'")
    expect(
      existsSync(
        join(APP_ROOT, 'src/app/api/billing-gateway/[...path]/route.ts')
      )
    ).toBe(false)
  })

  it('owns named routes for every currently supported finance resource', () => {
    for (const resource of FINANCE_RESOURCES) {
      expect(
        existsSync(
          join(APP_ROOT, 'src/app/api', resource, '[[...path]]', 'route.ts')
        ),
        `missing Invoice route for ${resource}`
      ).toBe(true)
    }
  })

  it('keeps Billing integration construction out of Invoice feature routes', () => {
    const featureRoot = join(APP_ROOT, 'src/app/(app)')
    const offenders = findSourceFiles(featureRoot).filter((path) => {
      const source = readFileSync(path, 'utf8')
      return source.includes('getInvoiceBillingIntegration')
    })

    expect(offenders).toEqual([])
  })

  it('keeps browser clients on Invoice-owned API URLs', () => {
    const clientRoot = join(APP_ROOT, 'src/lib/client')
    const offenders = findSourceFiles(clientRoot).filter((path) =>
      readFileSync(path, 'utf8').includes('/api/v1/')
    )

    expect(offenders).toEqual([])
  })
})

function findSourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findSourceFiles(path)
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')
      ? [path]
      : []
  })
}
