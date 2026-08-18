import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requestApiResult: vi.fn(),
}))

vi.mock('@876/core/client', () => ({
  requestApiResult: mocks.requestApiResult,
}))

import { request } from './request'

describe('Billing browser request boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestApiResult.mockResolvedValue({ data: null, error: null })
  })

  it('hides standalone /api/v1 topology behind the app-owned route', async () => {
    await request('/api/v1/customers?limit=25', { method: 'GET' })

    expect(mocks.requestApiResult).toHaveBeenCalledWith(
      '/api/customers?limit=25',
      { method: 'GET' }
    )
  })

  it('leaves product-local API routes unchanged', async () => {
    await request('/api/team/invites')

    expect(mocks.requestApiResult).toHaveBeenCalledWith(
      '/api/team/invites',
      undefined
    )
  })
})
