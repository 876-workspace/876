import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  connectionFind: vi.fn(),
  eventCreate: vi.fn(),
  eventFind: vi.fn(),
  eventFindMany: vi.fn(),
  eventUpdate: vi.fn(),
  eventUpdateMany: vi.fn(),
  attemptCreate: vi.fn(),
  attemptFind: vi.fn(),
  attemptFindOrThrow: vi.fn(),
  attemptUpdate: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { $transaction: mocks.transaction },
}))

import {
  claimProviderEvents,
  completePaymentAttempt,
  completeProviderEvent,
  recordProviderEvent,
  startPaymentAttempt,
} from '../provider-execution.repository'

const tx = {
  $queryRaw: mocks.queryRaw,
  paymentProviderConnection: { findFirst: mocks.connectionFind },
  paymentProviderEvent: {
    create: mocks.eventCreate,
    findUnique: mocks.eventFind,
    findMany: mocks.eventFindMany,
    update: mocks.eventUpdate,
    updateMany: mocks.eventUpdateMany,
  },
  paymentAttempt: {
    create: mocks.attemptCreate,
    findUnique: mocks.attemptFind,
    findUniqueOrThrow: mocks.attemptFindOrThrow,
    update: mocks.attemptUpdate,
  },
}

describe('provider execution repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(
      (work: (transaction: typeof tx) => unknown) => work(tx)
    )
    mocks.connectionFind.mockResolvedValue({ id: 'ppconn_1' })
  })

  it('durably records and deduplicates provider events', async () => {
    mocks.eventCreate.mockResolvedValueOnce({ id: 'ppevt_new' })

    await expect(
      recordProviderEvent({
        tenantId: 'btenant_1',
        connectionId: 'ppconn_1',
        externalEventId: 'evt_1',
        eventType: 'payment.succeeded',
        payload: { id: 'evt_1' },
        receivedAt: 1_700_000_000,
      })
    ).resolves.toEqual({ id: 'ppevt_new', duplicate: false })
    expect(mocks.eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          externalEventId: 'evt_1',
          status: 'RECEIVED',
        }),
      })
    )
  })

  it('claims provider events with SKIP LOCKED before returning them', async () => {
    mocks.queryRaw.mockResolvedValue([{ id: 'ppevt_1' }])
    mocks.eventUpdateMany.mockResolvedValue({ count: 1 })
    mocks.eventFindMany.mockResolvedValue([{ id: 'ppevt_1' }])

    await expect(claimProviderEvents(10, 1_700_000_000)).resolves.toEqual([
      { id: 'ppevt_1' },
    ])

    const queryParts = mocks.queryRaw.mock.calls[0]![0] as readonly string[]
    expect(queryParts.join(' ')).toContain('FOR UPDATE SKIP LOCKED')
    expect(mocks.eventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'PROCESSING', updatedAt: 1_700_000_000 },
      })
    )
  })

  it('only completes claimed provider events', async () => {
    mocks.queryRaw.mockResolvedValue([{ id: 'ppevt_1', status: 'RECEIVED' }])

    await expect(
      completeProviderEvent({
        tenantId: 'btenant_1',
        eventId: 'ppevt_1',
        outcome: 'processed',
      })
    ).rejects.toMatchObject({
      code: 'payment-provider-event/invalid-state',
      httpStatus: 409,
    })
  })

  it('rejects a payment-attempt replay with changed financial terms', async () => {
    mocks.attemptFind.mockResolvedValue({
      id: 'patm_1',
      customerId: 'cust_1',
      invoiceId: 'inv_1',
      amount: 1_000n,
      currency: 'JMD',
      status: 'PROCESSING',
    })

    await expect(
      startPaymentAttempt({
        tenantId: 'btenant_1',
        customerId: 'cust_1',
        invoiceId: 'inv_1',
        amount: 2_000n,
        currency: 'JMD',
        idempotencyKey: 'collect:inv_1',
      })
    ).rejects.toMatchObject({
      code: 'payment-attempt/idempotency-conflict',
      httpStatus: 409,
    })
  })

  it('does not change a terminal payment attempt outcome', async () => {
    mocks.queryRaw.mockResolvedValue([
      {
        id: 'patm_1',
        customerId: 'cust_1',
        invoiceId: null,
        amount: 1_000n,
        currency: 'JMD',
        status: 'SUCCEEDED',
      },
    ])

    await expect(
      completePaymentAttempt({
        tenantId: 'btenant_1',
        attemptId: 'patm_1',
        outcome: 'failed',
      })
    ).rejects.toMatchObject({
      code: 'payment-attempt/invalid-state',
      httpStatus: 409,
    })
  })
})
