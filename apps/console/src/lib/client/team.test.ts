import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { revoke, update } from './team'

describe('team client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: { count: 1 }, error: null })
  })

  it('uses the Console-owned team resource route', async () => {
    const result = await revoke('user_695d45c54a374ff0a570003e15668891')

    expect(result).toEqual({ data: { count: 1 }, error: null })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/team/user_695d45c54a374ff0a570003e15668891',
      { method: 'DELETE' }
    )
  })

  it('URL-encodes the opaque user id', async () => {
    await revoke('user/example?admin=true')

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/team/user%2Fexample%3Fadmin%3Dtrue',
      { method: 'DELETE' }
    )
  })

  it('preserves an authorization error result', async () => {
    const errorResult = {
      data: null,
      error: { code: 'auth/forbidden', message: 'Forbidden', httpStatus: 403 },
    }
    mocks.request.mockResolvedValue(errorResult)

    const result = await revoke('user_695d45c54a374ff0a570003e15668891')

    expect(result).toEqual(errorResult)
    expect(mocks.request).toHaveBeenCalledTimes(1)
  })

  it('preserves an already-revoked count of zero', async () => {
    mocks.request.mockResolvedValue({ data: { count: 0 }, error: null })

    const result = await revoke('user_695d45c54a374ff0a570003e15668891')

    expect(result).toEqual({ data: { count: 0 }, error: null })
    expect(mocks.request).toHaveBeenCalledTimes(1)
  })

  it('updates a member through the same Console-owned resource route', async () => {
    mocks.request.mockResolvedValue({
      data: { userId: 'user_123' },
      error: null,
    })

    await update('user_123', { status: 'suspended' })

    expect(mocks.request).toHaveBeenCalledWith('/api/team/user_123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'suspended' }),
    })
  })
})
