import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from './auth'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const

describe('Billing auth client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: { ok: true }, error: null })
  })

  it('posts the exact organization identifier and propagates the success envelope', async () => {
    mocks.request.mockResolvedValue({ data: { ok: true }, error: null })

    const result = await auth.switchOrganization({
      organizationId: 'org_island_123',
    })

    expect(result).toEqual({ data: { ok: true }, error: null })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/auth/switch-org', {
      method: 'POST',
      body: '{"organizationId":"org_island_123"}',
    })
  })

  it('propagates the complete error envelope from the route', async () => {
    mocks.request.mockResolvedValue({
      data: null,
      error: {
        code: 'auth/forbidden',
        message: 'Organization access is not permitted.',
      },
    })

    const result = await auth.switchOrganization({
      organizationId: 'org_archived_456',
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'auth/forbidden',
        message: 'Organization access is not permitted.',
      },
    })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/auth/switch-org', {
      method: 'POST',
      body: '{"organizationId":"org_archived_456"}',
    })
  })

  it.each(SECURITY_INPUTS)(
    'serializes security-sensitive organization input %# without changing the transport contract',
    async (organizationId) => {
      const result = await auth.switchOrganization({ organizationId })

      expect(result).toEqual({ data: { ok: true }, error: null })
      expect(mocks.request).toHaveBeenCalledTimes(1)
      expect(mocks.request).toHaveBeenCalledWith('/api/auth/switch-org', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
      })
    }
  )
})
