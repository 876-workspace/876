import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    accountingProviderSyncJob: { updateMany: mocks.updateMany },
  },
}))

import {
  markAccountingSyncDelivered,
  markAccountingSyncFailed,
} from '../accounting-sync.repository'

describe('accounting sync generation guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateMany.mockResolvedValue({ count: 1 })
  })

  it('marks delivery only when the claimed generation is still processing', async () => {
    await markAccountingSyncDelivered('apsync_1', 7, 1_800_000_000)

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'apsync_1', generation: 7, status: 'processing' },
      data: {
        status: 'delivered',
        deliveredAt: 1_800_000_000,
        lockedAt: null,
        lastErrorCode: null,
        lastError: null,
        updatedAt: 1_800_000_000,
      },
    })
  })

  it('cannot fail a newer enqueue with an older claimed generation', async () => {
    await markAccountingSyncFailed({
      id: 'apsync_1',
      generation: 7,
      attemptCount: 3,
      code: 'billing/provider-rate-limited',
      message: 'retry',
      retryable: true,
      now: 1_800_000_000,
    })

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'apsync_1', generation: 7, status: 'processing' },
        data: expect.objectContaining({
          status: 'failed',
          lockedAt: null,
          lastErrorCode: 'billing/provider-rate-limited',
        }),
      })
    )
  })
})
