import { beforeEach, describe, expect, it, vi } from 'vitest'

import { recurringInvoices } from './recurring-invoices'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./request', () => ({ request: requestMock }))

describe('Billing recurring invoice browser client', () => {
  beforeEach(() => {
    requestMock.mockResolvedValue({ data: null, error: null })
    vi.clearAllMocks()
  })

  it('creates a profile with an idempotency key and the exact payload', async () => {
    // ARRANGE
    const params = { profileName: 'Retainer' }

    // ACT
    await recurringInvoices.create(
      params as Parameters<typeof recurringInvoices.create>[0]
    )

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/recurring-invoices',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
      })
    )
    const init = requestMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toEqual(
      expect.any(String)
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('updates a profile with the exact id and payload', async () => {
    // ARRANGE
    const params = { profileName: 'Retainer+' }

    // ACT
    await recurringInvoices.update(
      'rinv_1',
      params as Parameters<typeof recurringInvoices.update>[1]
    )

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith('/api/v1/recurring-invoices/rinv_1', {
      method: 'PATCH',
      body: JSON.stringify(params),
    })

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('posts pause, resume, and stop to their profile paths', async () => {
    // ARRANGE — no state needed beyond the mock.

    // ACT
    await recurringInvoices.pause('rinv_1')
    await recurringInvoices.resume('rinv_1')
    await recurringInvoices.stop('rinv_1')

    // ASSERT
    expect(requestMock).toHaveBeenCalledTimes(3)
    for (const action of ['pause', 'resume', 'stop'])
      expect(requestMock).toHaveBeenCalledWith(
        `/api/v1/recurring-invoices/rinv_1/${action}`,
        expect.objectContaining({ method: 'POST', body: '{}' })
      )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })
})
