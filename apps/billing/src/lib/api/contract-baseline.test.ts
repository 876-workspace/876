import { describe, expect, it } from 'vitest'

import openApi from '../../../contracts/v1/openapi.json'
import routeManifest from '../../../contracts/v1/route-manifest.json'

function route(path: string) {
  const entry = routeManifest.routes.find(
    (candidate) => candidate.path === path
  )
  if (!entry) throw new Error(`Missing contract route: ${path}`)

  return entry
}

describe('Billing API v1 contract baseline', () => {
  it('captures every legacy versioned operation', () => {
    const operationCount = routeManifest.routes.reduce(
      (count, entry) => count + entry.operations.length,
      0
    )

    // 109 legacy Next.js routes / 187 operations, plus the payment-method and
    // payment-intent surface, plus the accounting-provider surface — both of
    // which only ever existed in @876/billing-api — plus the two quote
    // integration routes (3 operations) added so 876 Invoice can reach the
    // quote capability the documents service already owns.
    expect(routeManifest.routes).toHaveLength(130)
    expect(operationCount).toBe(216)
  })

  it('records authorization per operation instead of per route file', () => {
    expect(route('/products').operations).toEqual([
      expect.objectContaining({
        auth_tier: 'tenant',
        declared_permissions: ['catalog:read'],
        method: 'GET',
      }),
      expect.objectContaining({
        auth_tier: 'tenant',
        declared_permissions: ['catalog:write'],
        method: 'POST',
      }),
    ])

    expect(
      route('/integrations/organizations/{organizationId}/customers').operations
    ).toEqual([
      expect.objectContaining({
        auth_tier: 'integration',
        declared_scopes: ['billing.customers.read'],
        method: 'GET',
      }),
      expect.objectContaining({
        auth_tier: 'integration',
        declared_scopes: ['billing.customers.write'],
        method: 'POST',
      }),
    ])
  })

  it('does not document paths absent from the implementation inventory', () => {
    const implementedPaths = new Set(
      routeManifest.routes.map((entry) => entry.path)
    )

    expect(
      Object.keys(openApi.paths).filter((path) => !implementedPaths.has(path))
    ).toEqual([])
  })
})
