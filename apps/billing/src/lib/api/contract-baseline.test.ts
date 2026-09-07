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

  // `route-manifest.json` is the frozen *legacy* inventory (the Next.js and
  // FastAPI surface). Capabilities added after that freeze are legitimately
  // documented without appearing in it, so each one is listed here explicitly
  // rather than the check being dropped — an undocumented path still fails.
  const POST_LEGACY_PATHS = [
    // Customer contacts: Express-only, and already documented on `main`.
    '/customers/{customerId}/contacts',
    '/customers/{customerId}/contacts/{contactId}',
    // Quote lifecycle transitions, added with the Estimate/Quote merge.
    '/quotes/{quoteId}/send',
    '/quotes/{quoteId}/accept',
    '/quotes/{quoteId}/decline',
    '/quotes/{quoteId}/cancel',
    // Item stock adjustments, added with lightweight stock tracking. Stock is
    // an Express-only capability, so neither path exists in the legacy
    // inventory.
    '/items/{itemId}/stock-adjustments',
    '/integrations/organizations/{organizationId}/items/{itemId}/stock-adjustments',
    // Item variants and Storage-backed Item media, added with optional product
    // variants. Both are Express-only capabilities, and each is exposed at the
    // tenant tier and again at the integration tier so 876 Invoice reaches the
    // same Item records rather than growing a catalogue of its own.
    '/item-preferences',
    '/item-variants',
    '/items/{itemId}/variants',
    '/items/{itemId}/variants/generate',
    '/items/{itemId}/variants/{variantId}',
    '/items/{itemId}/variants/{variantId}/stock-adjustments',
    '/items/{itemId}/media',
    '/items/{itemId}/media/{fileId}',
    '/items/{itemId}/variants/{variantId}/media',
    '/items/{itemId}/variants/{variantId}/media/{fileId}',
    '/integrations/organizations/{organizationId}/item-preferences',
    '/integrations/organizations/{organizationId}/item-variants',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/generate',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/{variantId}',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/{variantId}/stock-adjustments',
    '/integrations/organizations/{organizationId}/items/{itemId}/media',
    '/integrations/organizations/{organizationId}/items/{itemId}/media/{fileId}',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/{variantId}/media',
    '/integrations/organizations/{organizationId}/items/{itemId}/variants/{variantId}/media/{fileId}',
  ]

  it('does not document paths absent from the implementation inventory', () => {
    const implementedPaths = new Set([
      ...routeManifest.routes.map((entry) => entry.path),
      ...POST_LEGACY_PATHS,
    ])

    expect(
      Object.keys(openApi.paths).filter((path) => !implementedPaths.has(path))
    ).toEqual([])
  })

  it('keeps every allowed post-legacy path actually documented', () => {
    const documented = new Set(Object.keys(openApi.paths))

    expect(POST_LEGACY_PATHS.filter((path) => !documented.has(path))).toEqual(
      []
    )
  })
})
