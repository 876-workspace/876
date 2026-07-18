import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PaymentCreateParams } from '@/types/payment'

import {
  applyPaymentAllocations,
  loadPaymentTargets,
  PaymentMutationError,
  reversePaymentAllocations,
} from './shared'

const { prismaRef, generateId } = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  generateId: vi.fn(() => 'palloc_123'),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

vi.mock('@/lib/id', () => ({ generateId }))

function params(
  overrides: Partial<PaymentCreateParams> = {}
): PaymentCreateParams {
  return {
    customerId: 'cus_123',
    paymentModeId: 'pmode_123',
    depositAccountId: 'ba_123',
    amount: 10_000n,
    bankCharges: 100n,
    currency: 'JMD',
    paymentDate: 1_788_825_600,
    referenceNumber: 'CHK-2048',
    notes: null,
    allocations: [{ invoiceId: 'inv_123', amount: 9_900n }],
    ...overrides,
  }
}

function targetTransaction() {
  return {
    customer: {
      findFirst: vi.fn().mockResolvedValue({ id: 'cus_123' }),
    },
    paymentMode: {
      findFirst: vi.fn().mockResolvedValue({ id: 'pmode_123' }),
    },
    bankAccount: {
      findFirst: vi.fn().mockResolvedValue({ id: 'ba_123', currency: 'JMD' }),
    },
    invoice: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'inv_123',
          customerId: 'cus_123',
          currency: 'JMD',
          status: 'SENT',
          amountDue: 9_900n,
          paidAt: null,
        },
      ]),
    },
  }
}

describe('payment allocation helpers', () => {
  beforeEach(() => {
    prismaRef.current = {}
    vi.clearAllMocks()
  })

  it('resolves tenant-owned payment targets', async () => {
    const tx = targetTransaction()

    const result = await loadPaymentTargets(tx as never, 'ten_123', params())

    expect(result.account).toEqual({ id: 'ba_123', currency: 'JMD' })
    expect(result.invoices.get('inv_123')?.amountDue).toBe(9_900n)
    expect(tx.customer.findFirst).toHaveBeenCalledWith({
      where: { id: 'cus_123', tenantId: 'ten_123', status: 'ACTIVE' },
      select: { id: true },
    })
  })

  it('allows an update to retain its current archived targets', async () => {
    const tx = targetTransaction()

    await loadPaymentTargets(tx as never, 'ten_123', params(), {
      customerId: 'cus_123',
      paymentModeId: 'pmode_123',
      depositAccountId: 'ba_123',
    })

    expect(tx.customer.findFirst).toHaveBeenCalledWith({
      where: { id: 'cus_123', tenantId: 'ten_123' },
      select: { id: true },
    })
    expect(tx.paymentMode.findFirst).toHaveBeenCalledWith({
      where: { id: 'pmode_123', tenantId: 'ten_123' },
      select: { id: true },
    })
    expect(tx.bankAccount.findFirst).toHaveBeenCalledWith({
      where: { id: 'ba_123', tenantId: 'ten_123' },
      select: { id: true, currency: true },
    })
  })

  it('rejects an invoice owned by another customer', async () => {
    const tx = targetTransaction()
    tx.invoice.findMany.mockResolvedValue([
      {
        id: 'inv_123',
        customerId: 'cus_other',
        currency: 'JMD',
        status: 'SENT',
        amountDue: 9_900n,
        paidAt: null,
      },
    ])

    await expect(
      loadPaymentTargets(tx as never, 'ten_123', params())
    ).rejects.toEqual(
      new PaymentMutationError(
        'Every invoice must belong to the selected customer.',
        422
      )
    )
  })

  it('rejects a deposit account in another currency', async () => {
    const tx = targetTransaction()
    tx.bankAccount.findFirst.mockResolvedValue({
      id: 'ba_123',
      currency: 'USD',
    })

    await expect(
      loadPaymentTargets(tx as never, 'ten_123', params())
    ).rejects.toMatchObject({
      message: 'The deposit account uses a different currency.',
      status: 422,
    })
  })

  it('settles a fully allocated invoice and stores reversal state', async () => {
    const tx = {
      invoice: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ amountDue: 0n }),
        update: vi.fn().mockResolvedValue({}),
      },
      paymentAllocation: { create: vi.fn().mockResolvedValue({}) },
    }
    const invoices = new Map([
      [
        'inv_123',
        {
          id: 'inv_123',
          customerId: 'cus_123',
          currency: 'JMD',
          status: 'SENT' as const,
          amountDue: 9_900n,
          paidAt: null,
        },
      ],
    ])

    await applyPaymentAllocations(
      tx as never,
      'ten_123',
      'pay_123',
      1_788_825_600,
      [{ invoiceId: 'inv_123', amount: 9_900n }],
      invoices,
      1_788_825_601
    )

    expect(tx.paymentAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'palloc_123',
        invoiceStatusBefore: 'SENT',
        invoicePaidAtBefore: null,
      }),
    })
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv_123' },
      data: {
        status: 'PAID',
        paidAt: 1_788_825_600,
        updatedAt: 1_788_825_601,
      },
    })
  })

  it('restores invoice amount and lifecycle state', async () => {
    const tx = {
      invoice: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }

    await reversePaymentAllocations(
      tx as never,
      'ten_123',
      [
        {
          invoiceId: 'inv_123',
          amount: 9_900n,
          invoiceStatusBefore: 'SENT',
          invoicePaidAtBefore: null,
        },
      ],
      1_788_825_601
    )

    expect(tx.invoice.updateMany).toHaveBeenCalledWith({
      where: { id: 'inv_123', tenantId: 'ten_123' },
      data: {
        amountDue: { increment: 9_900n },
        amountPaid: { decrement: 9_900n },
        status: 'SENT',
        paidAt: null,
        updatedAt: 1_788_825_601,
      },
    })
  })
})
