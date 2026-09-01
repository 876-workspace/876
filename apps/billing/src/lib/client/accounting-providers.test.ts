import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { accountingProviders } from './accounting-providers'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.request.mockResolvedValue({ data: {}, error: null })
})

describe('accountingProviders browser client', () => {
  it('creates connections through the Billing-owned same-origin route', async () => {
    await accountingProviders.connections.create({
      providerId: 'aprov_zoho_books',
      name: 'Primary Zoho',
      environment: 'live',
      mode: 'mirror',
    })

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/accounting-providers/connections',
      {
        method: 'POST',
        body: JSON.stringify({
          providerId: 'aprov_zoho_books',
          name: 'Primary Zoho',
          environment: 'live',
          mode: 'mirror',
        }),
      }
    )
  })

  it.each([
    ['authorize', 'authorize'],
    ['validate', 'validate'],
    ['reconcile', 'reconcile'],
  ] as const)('routes %s through the bounded connection action path', async (method, action) => {
    await accountingProviders.connections[method]('acpc_123')

    expect(mocks.request).toHaveBeenCalledWith(
      `/api/accounting-providers/connections/acpc_123/${action}`,
      { method: 'POST' }
    )
  })

  it('disables a connection with DELETE on the bounded connection route', async () => {
    await accountingProviders.connections.disable('acpc_123')

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/accounting-providers/connections/acpc_123',
      { method: 'DELETE' }
    )
  })
})
