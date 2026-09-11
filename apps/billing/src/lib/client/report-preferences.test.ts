import { beforeEach, describe, expect, it, vi } from 'vitest'

import { reportPreferences } from './report-preferences'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./request', () => ({ request: requestMock }))

describe('Billing report preferences browser client', () => {
  beforeEach(() => {
    requestMock.mockResolvedValue({ data: null, error: null })
    vi.clearAllMocks()
  })

  it('retrieves preferences with the exact path', async () => {
    // ARRANGE — no input

    // ACT
    await reportPreferences.retrieve()

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith('/api/v1/report-preferences', {
      method: 'GET',
    })

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('updates preferences with the exact payload once', async () => {
    // ARRANGE
    const params = { timezone: 'America/Jamaica', fiscalYearStartMonth: 4 }

    // ACT
    await reportPreferences.update(params)

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith('/api/v1/report-preferences', {
      method: 'PATCH',
      body: JSON.stringify(params),
    })

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })
})
