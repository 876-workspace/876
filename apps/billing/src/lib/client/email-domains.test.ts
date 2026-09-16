import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { emailDomains } from './email-domains'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.request.mockResolvedValue({ data: {}, error: null })
})

describe('emailDomains browser client', () => {
  it('creates a domain through the app-owned email-domains route', async () => {
    await emailDomains.create({ name: 'mail.example.com' })

    expect(mocks.request).toHaveBeenCalledWith('/api/email-domains', {
      method: 'POST',
      body: JSON.stringify({ name: 'mail.example.com' }),
    })
  })

  it('verifies a domain through the app-owned verify route', async () => {
    await emailDomains.verify('dom_1')

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/email-domains/dom_1/verify',
      { method: 'POST' }
    )
  })
})
