import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  claimCommand: vi.fn(),
  completeCommand: vi.fn(),
  enqueueBillingEvent: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/db/client', () => ({
  prisma: {
    $transaction: async (work: (tx: object) => Promise<unknown>) => {
      try {
        const result = await work({
          quote: { findFirst: mocks.findFirst, updateMany: mocks.updateMany },
        })
        mocks.commit()
        return result
      } catch (error) {
        mocks.rollback()
        throw error
      }
    },
  },
}))
vi.mock('@/modules/command-idempotency', () => ({
  claimCommand: mocks.claimCommand,
  completeCommand: mocks.completeCommand,
}))
vi.mock('@/modules/outbox', () => ({
  enqueueBillingEvent: mocks.enqueueBillingEvent,
}))

import { transitionQuoteWorkflow } from './transition-quote'

const idempotency = { key: 'retry-key', requestHash: 'hash' }
const quote = {
  id: 'quo_1',
  status: 'DRAFT',
  expiresAt: 200,
  sentAt: null,
  customerId: 'cus_1',
  number: 'Q-1',
  currency: 'JMD',
}

describe('quote lifecycle transaction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.findFirst.mockResolvedValue(quote)
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.claimCommand.mockResolvedValue({
      data: { state: 'claimed', claimId: 'cmd_1' },
      error: null,
    })
  })

  it.each([
    { row: null, status: 404, code: 'quote/not-found' },
    {
      row: { ...quote, expiresAt: 100 },
      status: 409,
      code: 'billing/quote-invalid-state',
    },
    {
      row: { ...quote, status: 'CANCELED' },
      status: 409,
      code: 'billing/quote-invalid-state',
    },
  ])('rolls back the claimed key on $code', async ({ row, status, code }) => {
    mocks.findFirst.mockResolvedValue(row)
    expect(
      await transitionQuoteWorkflow('ten_1', 'quo_1', 'accept', idempotency)
    ).toMatchObject({ data: null, status, code })
    expect(mocks.rollback).toHaveBeenCalledOnce()
    expect(mocks.commit).not.toHaveBeenCalled()
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.completeCommand).not.toHaveBeenCalled()
    expect(mocks.enqueueBillingEvent).not.toHaveBeenCalled()
  })

  it('rolls back the claimed key when the conditional transition loses a race', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })
    expect(
      await transitionQuoteWorkflow('ten_1', 'quo_1', 'accept', idempotency)
    ).toMatchObject({ data: null, status: 409 })
    expect(mocks.rollback).toHaveBeenCalledOnce()
    expect(mocks.enqueueBillingEvent).not.toHaveBeenCalled()
  })

  it('commits acceptance, its event and key completion together', async () => {
    expect(
      await transitionQuoteWorkflow('ten_1', 'quo_1', 'accept', idempotency)
    ).toEqual({ data: { id: 'quo_1' }, error: null })
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'quo_1', tenantId: 'ten_1', status: 'DRAFT' },
      data: { status: 'ACCEPTED', acceptedAt: 100, updatedAt: 100 },
    })
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledWith(
      expect.anything(),
      'ten_1',
      {
        type: 'quote.accepted',
        version: 1,
        resource: { type: 'quote', id: 'quo_1' },
        payload: {
          quoteId: 'quo_1',
          customerId: 'cus_1',
          number: 'Q-1',
          currency: 'JMD',
          status: 'ACCEPTED',
          occurredAt: 100,
        },
        occurredAt: 100,
      }
    )
    expect(mocks.completeCommand).toHaveBeenCalledWith(
      expect.anything(),
      'ten_1',
      'cmd_1',
      100
    )
    expect(mocks.commit).toHaveBeenCalledOnce()
  })

  it('resends with a fresh event while preserving the first send timestamp', async () => {
    mocks.findFirst.mockResolvedValue({ ...quote, status: 'SENT', sentAt: 50 })
    await transitionQuoteWorkflow('ten_1', 'quo_1', 'send')
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'SENT', sentAt: 50, updatedAt: 100 },
      })
    )
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledOnce()
  })

  it('does not repeat state or event writes for a completed idempotency key', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: { state: 'replayed', claimId: 'cmd_1' },
      error: null,
    })
    expect(
      await transitionQuoteWorkflow('ten_1', 'quo_1', 'send', idempotency)
    ).toEqual({ data: { id: 'quo_1' }, error: null })
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.enqueueBillingEvent).not.toHaveBeenCalled()
  })
})
