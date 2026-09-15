import { beforeEach, describe, expect, it, vi } from 'vitest'

import { branding } from './branding'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./request', () => ({ request: requestMock }))

describe('Invoice branding browser client', () => {
  beforeEach(() => {
    requestMock.mockResolvedValue({ data: null, error: null })
    vi.clearAllMocks()
  })

  it('retrieves branding with the exact path', async () => {
    // ARRANGE — no input

    // ACT
    await branding.retrieve()

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith('/api/branding', {
      method: 'GET',
    })

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('updates branding with the exact payload once', async () => {
    // ARRANGE
    const params = { appearance: 'dark' as const }

    // ACT
    await branding.update(params)

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith('/api/branding', {
      method: 'PATCH',
      body: JSON.stringify(params),
    })

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })
})
