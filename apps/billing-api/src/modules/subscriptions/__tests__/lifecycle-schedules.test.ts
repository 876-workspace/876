import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@/db'

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    subscriptionLifecycleSchedule: { updateMany: vi.fn() },
  },
  queryRaw: vi.fn(),
}))

vi.mock('../repositories/db', () => ({ prisma: mocks.prisma }))
vi.mock('@/platform/ids', () => ({
  generateId: (entity: string) => `${entity.toLowerCase()}_1`,
}))
vi.mock('../repositories/charges', () => ({
  invoiceUnbilledCharges: vi.fn(),
}))
vi.mock('../repositories/credits', () => ({
  createSubscriptionCredit: vi.fn(),
}))

import {
  applyDueLifecycleSchedule,
  processDueLifecycleSchedulesAcrossTenants,
} from '../repositories/lifecycle'

const AS_OF = Date.UTC(2024, 1, 29, 12) / 1000

function schedule(
  overrides: Partial<{
    action: 'PAUSE' | 'RESUME' | 'CANCEL'
    effectiveAt: number
    resumeAt: number | null
    resumeBillingBehavior:
      'START_NEW_PERIOD' | 'CONTINUE_EXISTING_PERIOD' | null
  }> = {}
) {
  return {
    id: 'schedule_1',
    subscriptionId: 'sub_1',
    action: 'PAUSE' as const,
    effectiveAt: AS_OF,
    pauseUnbilledBehavior: 'RETAIN' as const,
    pauseCreditBehavior: 'NONE' as const,
    resumeAt: null,
    resumeBillingBehavior: 'START_NEW_PERIOD' as const,
    reason: 'Customer requested a temporary hold.',
    requestedByUserId: 'usr_1',
    ...overrides,
  }
}

describe('due subscription lifecycle schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies a due pause and leaves no future invoice date', async () => {
    const tx = {
      subscriptionLifecycleSchedule: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn(),
      },
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          status: 'ACTIVE',
          deletedAt: null,
          billingTiming: 'IN_ADVANCE',
          nextBillingAt: AS_OF,
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          tenantId: 'ten_1',
          customerId: 'cus_1',
          billingTiming: 'IN_ADVANCE',
          currentPeriodStart: AS_OF,
          currentPeriodEnd: AS_OF + 86_400,
          servicePeriodStart: AS_OF,
          servicePeriodEnd: AS_OF + 86_400,
          items: [],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }

    await expect(
      applyDueLifecycleSchedule(
        tx as unknown as Prisma.TransactionClient,
        schedule(),
        AS_OF
      )
    ).resolves.toBe(true)

    expect(tx.subscriptionLifecycleSchedule.updateMany).toHaveBeenCalledTimes(1)
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: {
        status: 'PAUSED',
        pausedAt: AS_OF,
        nextBillingAt: null,
        nextAdvanceInvoiceAt: null,
        updatedAt: AS_OF,
      },
    })
    expect(tx.subscriptionEvent.create).toHaveBeenCalledTimes(1)
  })

  it('applies a due resume and opens a new billing period', async () => {
    const tx = {
      subscriptionLifecycleSchedule: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          status: 'PAUSED',
          deletedAt: null,
          billingTiming: 'IN_ARREARS',
          nextBillingAt: null,
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          billingTiming: 'IN_ARREARS',
          servicePeriodStart: null,
          servicePeriodEnd: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          advanceBillingEnabled: false,
          advanceBillingDays: null,
          items: [
            {
              price: { intervalUnit: 'MONTH', intervalCount: 1 },
            },
          ],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }

    await expect(
      applyDueLifecycleSchedule(
        tx as unknown as Prisma.TransactionClient,
        schedule({
          action: 'RESUME',
          resumeBillingBehavior: 'START_NEW_PERIOD',
        }),
        AS_OF
      )
    ).resolves.toBe(true)

    expect(tx.subscriptionLifecycleSchedule.updateMany).toHaveBeenCalledTimes(1)
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        currentPeriodStart: AS_OF,
        nextBillingAt: Date.UTC(2024, 2, 29, 12) / 1000,
      }),
    })
    expect(tx.subscriptionEvent.create).toHaveBeenCalledTimes(1)
  })

  it('leaves an arrears period-end cancel scheduled until its final period is billed', async () => {
    const tx = {
      subscriptionLifecycleSchedule: { updateMany: vi.fn() },
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          status: 'ACTIVE',
          deletedAt: null,
          billingTiming: 'IN_ARREARS',
          nextBillingAt: AS_OF,
        }),
      },
    }

    await expect(
      applyDueLifecycleSchedule(
        tx as unknown as Prisma.TransactionClient,
        schedule({ action: 'CANCEL' }),
        AS_OF
      )
    ).resolves.toBe(false)

    expect(tx.subscriptionLifecycleSchedule.updateMany).not.toHaveBeenCalled()
  })

  it('does not claim an unbilled arrears period-end cancel during the cross-tenant drain', async () => {
    mocks.queryRaw.mockResolvedValue([])
    mocks.prisma.$transaction.mockImplementation(
      (work: (tx: { $queryRaw: typeof mocks.queryRaw }) => unknown) =>
        work({ $queryRaw: mocks.queryRaw })
    )

    await expect(
      processDueLifecycleSchedulesAcrossTenants(AS_OF)
    ).resolves.toEqual({ object: 'subscription_schedule_run', applied: 0 })

    const query = mocks.queryRaw.mock.calls[0]![0] as { text: string }
    expect(query.text).toContain("s.action = 'CANCEL'")
    expect(query.text).toContain("b.billing_timing = 'IN_ARREARS'")
    expect(query.text).toContain('b.next_billing_at <= s.effective_at')
    expect(
      mocks.prisma.subscriptionLifecycleSchedule.updateMany
    ).not.toHaveBeenCalled()
  })
})
