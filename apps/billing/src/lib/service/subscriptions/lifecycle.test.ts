import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    subscriptionLifecycleSchedule: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/id', () => ({
  generateId: (entity: string) => `${entity.toLowerCase()}_1`,
}))

import { processDueLifecycleSchedules } from './lifecycle'

function schedule(action: 'PAUSE' | 'RESUME' | 'CANCEL') {
  return {
    id: 'schedule_1',
    tenantId: 'ten_1',
    subscriptionId: 'sub_1',
    action,
    effectiveAt: 100,
    status: 'SCHEDULED',
    resumeAt: null,
    pauseUnbilledBehavior: null,
    pauseCreditBehavior: null,
    resumeBillingBehavior: null,
    reason: 'Requested',
    requestedByUserId: 'user_1',
  }
}

describe('processDueLifecycleSchedules', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the contractual effective time and records the later processing time', async () => {
    mocks.prisma.subscriptionLifecycleSchedule.findMany.mockResolvedValue([
      schedule('CANCEL'),
    ])
    const tx = {
      subscriptionLifecycleSchedule: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({}),
      },
      subscription: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ status: 'ACTIVE', deletedAt: null }),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ servicePeriodStart: 50 }),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(processDueLifecycleSchedules('ten_1', 200)).resolves.toEqual({
      object: 'subscription_schedule_run',
      applied: 1,
    })
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({
        canceledAt: 100,
        endedAt: 100,
        servicePeriodEnd: 100,
        updatedAt: 200,
      }),
    })
    expect(tx.subscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: { reason: 'Requested', effectiveAt: 100 },
        occurredAt: 200,
      }),
    })
  })

  it('skips stale actions when the subscription state has changed', async () => {
    mocks.prisma.subscriptionLifecycleSchedule.findMany.mockResolvedValue([
      schedule('PAUSE'),
    ])
    const tx = {
      subscriptionLifecycleSchedule: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({}),
      },
      subscription: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ status: 'CANCELED', deletedAt: null }),
        update: vi.fn(),
      },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(processDueLifecycleSchedules('ten_1', 200)).resolves.toEqual({
      object: 'subscription_schedule_run',
      applied: 0,
    })
    expect(tx.subscriptionLifecycleSchedule.update).toHaveBeenCalledWith({
      where: { id: 'schedule_1' },
      data: expect.objectContaining({ status: 'SKIPPED', appliedAt: null }),
    })
    expect(tx.subscription.update).not.toHaveBeenCalled()
  })
})
