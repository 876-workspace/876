import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const APP_ROOT = resolve(process.cwd())
const API_ROOT = join(APP_ROOT, 'src/app/api')

const OWNED_ROUTES = [
  'billing-accounts/route.ts',
  'billing-subscriptions/route.ts',
  'organizations/[id]/customers/route.ts',
  'finance/reconcile/route.ts',
  'apps/[appId]/image/route.ts',
  'organizations/[id]/image/route.ts',
  'users/[id]/image/route.ts',
  'widget-features/[id]/route.ts',
  'notes/route.ts',
  'note-collections/route.ts',
  'notes/admin/route.ts',
] as const

const SERVICE_CLIENT_IMPORT =
  /from ['"](?:@876\/billing\/(?:admin|integration)|@876\/widgets\/server(?:\/admin)?|@876\/client\/server)['"]/

const SERVICE_ENV =
  /\b(?:BILLING_API_URL|COURIERS_API_URL|STORAGE_API_URL|WIDGETS_API_URL)\b/

describe('Console product API boundary', () => {
  it('does not expose service-owned API namespaces', () => {
    for (const root of ['billing', 'storage', 'widgets']) {
      expect(findRouteFiles(join(API_ROOT, root)), root).toEqual([])
    }
  })

  it('owns the cross-service resources it exposes to the browser', () => {
    for (const route of OWNED_ROUTES) {
      expect(existsSync(join(API_ROOT, route)), `missing ${route}`).toBe(true)
    }
  })

  it('keeps service client construction out of feature and app code', () => {
    const roots = [
      join(APP_ROOT, 'src/app/(app)'),
      join(APP_ROOT, 'src/features'),
      join(APP_ROOT, 'src/components'),
    ]
    const offenders = roots.flatMap(findSourceFiles).filter((path) => {
      const source = readFileSync(path, 'utf8')
      return SERVICE_CLIENT_IMPORT.test(source) || SERVICE_ENV.test(source)
    })

    expect(offenders).toEqual([])
  })

  it('keeps multi-service construction centralized in the Console $876 module', () => {
    const source = readFileSync(join(APP_ROOT, 'src/lib/876/index.ts'), 'utf8')

    expect(source).toContain('createConsole876Client')
    expect(source).toContain('create876ServerClient')
    expect(source).toContain('createBillingAdminClient')
    expect(source).toContain('create876BillingIntegrationClient')
    expect(source).toContain('createWidgetsAdminClient')
  })
})

function findRouteFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findRouteFiles(path)
    return entry.name === 'route.ts' ? [path] : []
  })
}

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
