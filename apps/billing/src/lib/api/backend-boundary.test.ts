import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const APP_ROOT = resolve(process.cwd())
const APP_RESOURCES = [
  'addons',
  'bank-accounts',
  'bank-transactions',
  'credit-notes',
  'currencies',
  'customers',
  'discounts',
  'invoice-preferences',
  'invoices',
  'items',
  'members',
  'payment-modes',
  'payment-providers',
  'payment-terms',
  'payments',
  'plans',
  'prices',
  'price-lists',
  'products',
  'quotes',
  'refunds',
  'roles',
  'salespeople',
  'subscriptions',
  'tax-authorities',
  'tax-rates',
] as const

describe('standalone Billing API boundary', () => {
  it('has no legacy Billing or admin route handlers', () => {
    const retiredRoots = [
      join(APP_ROOT, 'src/app/api/billing'),
      join(APP_ROOT, 'src/app/api/admin'),
    ]

    expect(retiredRoots.flatMap(findRouteHandlers)).toEqual([])
  })

  it('does not expose the standalone API version or generic Billing gateway', () => {
    const config = readFileSync(join(APP_ROOT, 'next.config.ts'), 'utf8')

    expect(config).not.toContain("source: '/api/v1/:path*'")
    expect(config).not.toContain("destination: '/api/billing-gateway/:path*'")
    expect(
      existsSync(
        join(APP_ROOT, 'src/app/api/billing-gateway/[...path]/route.ts')
      )
    ).toBe(false)
  })

  it('owns an explicit same-origin route for every Billing browser resource', () => {
    for (const resource of APP_RESOURCES) {
      expect(
        existsSync(
          join(APP_ROOT, 'src/app/api', resource, '[[...path]]', 'route.ts')
        ),
        `missing app-owned route for ${resource}`
      ).toBe(true)
    }
  })

  it('does not let the Billing UI run database migrations', () => {
    const packageJson = JSON.parse(
      readFileSync(join(APP_ROOT, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts['db:migrate']).toBeUndefined()
    expect(packageJson.scripts['db:deploy']).toBeUndefined()
  })
})

function findRouteHandlers(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findRouteHandlers(path)
    return entry.name === 'route.ts' ? [path] : []
  })
}
