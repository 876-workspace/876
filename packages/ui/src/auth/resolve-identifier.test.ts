import { describe, expect, it, vi } from 'vitest'

import { createDefaultIdentifierResolver } from './resolve-identifier'

describe('createDefaultIdentifierResolver', () => {
  it('trims identifiers and normalizes a successful API response', async () => {
    const resolve = vi.fn().mockResolvedValue({
      data: {
        email: 'ada@example.com',
        exists: true,
        methods: ['password', 'otp'],
        ssoProvider: 'google',
      },
      error: null,
    })
    const resolver = createDefaultIdentifierResolver({ resolve } as never)

    await expect(resolver('  ada@example.com  ')).resolves.toEqual({
      email: 'ada@example.com',
      exists: true,
      methods: ['password', 'otp'],
      ssoProvider: 'google',
    })
    expect(resolve).toHaveBeenCalledWith({ identifier: 'ada@example.com' })
  })

  it('keeps the flow usable when resolution fails or omits optional values', async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
      .mockResolvedValueOnce({ data: { exists: true }, error: null })
    const resolver = createDefaultIdentifierResolver({ resolve } as never)

    await expect(resolver(' ada@example.com ')).resolves.toEqual({
      email: 'ada@example.com',
      exists: false,
      methods: ['password'],
      ssoProvider: null,
    })
    await expect(resolver('ada@example.com')).resolves.toEqual({
      email: 'ada@example.com',
      exists: true,
      methods: ['password'],
      ssoProvider: null,
    })
  })
})
