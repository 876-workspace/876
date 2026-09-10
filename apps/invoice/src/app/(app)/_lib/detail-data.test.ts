import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getInvoice: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('@/lib/invoice', () => ({ getInvoice: mocks.getInvoice }))

import { resolveItemDetail } from './detail-data'

describe('resolveItemDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null without retrieving an item when no invoice facade is available', async () => {
    mocks.getInvoice.mockResolvedValue(null)

    const detail = await resolveItemDetail('item_123')

    expect(detail).toBeNull()
    expect(mocks.getInvoice).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })

  it('returns the exact invoice facade and item result after retrieving the item once', async () => {
    const result = { data: { id: 'item_123', name: 'Consulting' }, error: null }
    const invoice = { items: { retrieve: mocks.retrieve } }
    mocks.getInvoice.mockResolvedValue(invoice)
    mocks.retrieve.mockResolvedValue(result)

    const detail = await resolveItemDetail('item_123')

    expect(detail).toEqual({ invoice, result })
    expect(detail?.invoice).toBe(invoice)
    expect(detail?.result).toBe(result)
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith('item_123')
  })

  it('returns an item error result unchanged instead of throwing', async () => {
    const result = {
      data: null,
      error: {
        code: 'billing/item-not-found',
        message: 'The requested item does not exist.',
      },
    }
    const invoice = { items: { retrieve: mocks.retrieve } }
    mocks.getInvoice.mockResolvedValue(invoice)
    mocks.retrieve.mockResolvedValue(result)

    const detail = await resolveItemDetail('item_missing')

    expect(detail).toEqual({ invoice, result })
    expect(detail?.result).toBe(result)
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith('item_missing')
  })

  it('propagates an item retrieval rejection', async () => {
    const error = new Error('Billing service unavailable')
    const invoice = { items: { retrieve: mocks.retrieve } }
    mocks.getInvoice.mockResolvedValue(invoice)
    mocks.retrieve.mockRejectedValue(error)

    await expect(resolveItemDetail('item_123')).rejects.toThrow(error)

    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith('item_123')
  })
})
