import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876AdminClient } from './client'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const connection = {
  object: 'accounting-provider-connection',
  id: 'apcon_1',
  providerId: 'aprov_zoho_books',
  providerKey: 'zoho-books',
  name: 'Primary Zoho Books',
  environment: 'live',
  status: 'active',
  mode: 'mirror',
  providerOrganizationId: 'zoho_org_1',
  apiDomain: 'https://www.zohoapis.com',
  scopes: ['ZohoBooks.contacts.READ'],
  lastSyncedAt: null,
  lastSuccessfulSyncAt: null,
  lastErrorCode: null,
  createdAt: 1,
  updatedAt: 1,
} as const

describe('@876/billing operator accounting providers', () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const billing = create876AdminClient({
    baseUrl: 'http://billing.test',
    internalKey: 'billing-internal',
    fetch,
  })

  beforeEach(() => fetch.mockReset())

  it('uses the operator connection lifecycle endpoints', async () => {
    fetch
      .mockResolvedValueOnce(
        json({
          object: 'list',
          data: [connection],
          has_more: false,
          total_count: 1,
          url: '/api/v1/admin/organizations/org_1/accounting-provider-connections',
        })
      )
      .mockResolvedValueOnce(json(connection))
      .mockResolvedValueOnce(
        json({
          object: 'accounting-provider-authorization',
          connectionId: 'apcon_1',
          authorizeUrl: 'https://accounts.zoho.com/oauth/v2/auth?state=test',
          expiresAt: 123,
        })
      )

    await billing.accountingProviders.connections.list('org_1')
    await billing.accountingProviders.connections.retrieve({
      organizationId: 'org_1',
      connectionId: 'apcon_1',
    })
    await billing.accountingProviders.connections.authorize({
      organizationId: 'org_1',
      connectionId: 'apcon_1',
    })

    expect(fetch.mock.calls[0]?.[0].toString()).toBe(
      'http://billing.test/api/v1/admin/organizations/org_1/accounting-provider-connections'
    )
    expect(fetch.mock.calls[1]?.[0].toString()).toContain(
      '/accounting-provider-connections/apcon_1'
    )
    expect(fetch.mock.calls[2]?.[0].toString()).toContain(
      '/accounting-provider-connections/apcon_1/authorize'
    )
    for (const call of fetch.mock.calls) {
      const headers = new Headers(call[1]?.headers)
      expect(headers.get('x-internal-key')).toBe('billing-internal')
    }
  })

  it('lists and adopts provider import candidates', async () => {
    fetch
      .mockResolvedValueOnce(
        json({
          object: 'list',
          data: [
            {
              object: 'accounting-provider-import-candidate',
              resourceType: 'customer',
              externalId: 'zc_1',
              name: 'Acme Ltd',
              secondary: 'Acme Limited',
              status: 'active',
              mappedResourceId: null,
            },
          ],
          has_more: false,
          total_count: null,
          url: '/imports/customer',
        })
      )
      .mockResolvedValueOnce(
        json(
          {
            object: 'accounting-provider-adoption',
            connectionId: 'apcon_1',
            resourceType: 'customer',
            resourceId: 'cus_1',
            externalId: 'zc_1',
          },
          201
        )
      )

    const candidates = await billing.accountingProviders.connections.imports.list({
      organizationId: 'org_1',
      connectionId: 'apcon_1',
      resourceType: 'customer',
      page: 2,
      perPage: 50,
    })
    const adoption = await billing.accountingProviders.connections.imports.adopt({
      organizationId: 'org_1',
      connectionId: 'apcon_1',
      resourceType: 'customer',
      resourceId: 'cus_1',
      externalId: 'zc_1',
    })

    expect(candidates.error).toBeNull()
    expect(adoption.error).toBeNull()
    expect(fetch.mock.calls[0]?.[0].toString()).toContain(
      '/imports/customer?page=2&perPage=50'
    )
    expect(fetch.mock.calls[1]?.[1]?.method).toBe('POST')
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
      resourceId: 'cus_1',
      externalId: 'zc_1',
    })
  })

  it('does not send a request when the operator key is missing', async () => {
    const unconfigured = create876AdminClient({
      baseUrl: 'http://billing.test',
      internalKey: '',
      fetch,
    })

    const result = await unconfigured.accountingProviders.list()

    expect(fetch).not.toHaveBeenCalled()
    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/admin-not-configured',
        message: 'Billing synchronization is not configured.',
      },
    })
  })
})
