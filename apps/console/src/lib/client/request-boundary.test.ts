import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from './request'

function jsonResponse() {
  return new Response(JSON.stringify({ data: null, error: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('Console browser API boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['/api/billing/accounts', '/api/billing-accounts'],
    ['/api/billing/accounts/acct_1', '/api/billing-accounts/acct_1'],
    [
      '/api/billing/subscriptions/sub_1/items/item_1',
      '/api/billing-subscriptions/sub_1/items/item_1',
    ],
    [
      '/api/billing/integrations/organizations/org_1/customers',
      '/api/organizations/org_1/customers',
    ],
    ['/api/storage/apps/app_1/image', '/api/apps/app_1/image'],
    [
      '/api/storage/organizations/org_1/image/complete',
      '/api/organizations/org_1/image/complete',
    ],
    [
      '/api/storage/users/user_1/image/remove',
      '/api/users/user_1/image/remove',
    ],
    ['/api/widgets/features/feat_1', '/api/widget-features/feat_1'],
  ])('maps %s to the Console-owned route %s', async (input, expected) => {
    await request(input)

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe(expected)
  })

  it('leaves existing Console-owned routes unchanged', async () => {
    await request('/api/users/user_1/profile')

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/users/user_1/profile')
  })
})
