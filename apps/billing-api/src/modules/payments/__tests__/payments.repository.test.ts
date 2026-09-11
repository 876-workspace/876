import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  PaymentApplyParams,
  PaymentUpdateParams,
} from '../schemas/payment'

const mocks = vi.hoisted(() => ({
  hasEnabledCurrency: vi.fn(),
  mockPrismaRef: { current: null as MockPrisma | null },
}))

vi.mock('@/db/client', () => ({
  get prisma() {
    return mocks.mockPrismaRef.current
  },
}))

vi.mock('@/modules/currencies', () => ({
  hasEnabledCurrency: mocks.hasEnabledCurrency,
}))

type MockPrisma = {
  payment: {
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

const TENANT = 'ten_1'
const PAYMENT = 'pay_1'

function buildPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    payment: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((fn: (tx: MockPrisma) => unknown) =>
    fn(prisma)
  )
  return prisma
}

function updateParams(): PaymentUpdateParams {
  return {
    customerId: 'cus_1',
    paymentModeId: 'mode_1',
    depositAccountId: 'bank_1',
    amount: 1_000n,
    bankCharges: 0n,
    currency: 'JMD',
    paymentDate: 1_788_883_200,
    referenceNumber: null,
    notes: null,
    allocations: [],
  }
}

function applyParams(): PaymentApplyParams {
  return { allocations: [{ invoiceId: 'inv_1', amount: 1_000n }] }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  mocks.mockPrismaRef.current = buildPrisma()
  mocks.hasEnabledCurrency.mockResolvedValue(true)
})

describe('ordinary payments repository sales receipt isolation', () => {
  it('excludes Sales Receipt payments from the ordinary payment list', async () => {
    const { list } = await import('../repositories/payments/list')

    await list(TENANT)

    expect(mocks.mockPrismaRef.current!.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          salesReceipt: { is: null },
        }),
      })
    )
  })

  it('does not retrieve a Sales Receipt payment through the ordinary resource', async () => {
    const { retrieve } = await import('../repositories/payments/retrieve')

    await expect(retrieve(TENANT, PAYMENT)).resolves.toBeNull()

    expect(mocks.mockPrismaRef.current!.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: PAYMENT,
          tenantId: TENANT,
          salesReceipt: { is: null },
        }),
      })
    )
  })

  it('rejects updating a Sales Receipt payment through the ordinary resource', async () => {
    const { update } = await import('../repositories/payments/update')

    await expect(update(TENANT, PAYMENT, updateParams())).resolves.toEqual({
      data: null,
      error: 'Payment not found.',
      status: 404,
    })

    expect(mocks.mockPrismaRef.current!.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ salesReceipt: { is: null } }),
      })
    )
  })

  it('rejects canceling a Sales Receipt payment through the ordinary resource', async () => {
    const { deletePayment } = await import('../repositories/payments/delete')

    await expect(deletePayment(TENANT, PAYMENT)).resolves.toEqual({
      data: null,
      error: 'Payment not found.',
      status: 404,
    })

    expect(mocks.mockPrismaRef.current!.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ salesReceipt: { is: null } }),
      })
    )
  })

  it('rejects applying a Sales Receipt payment to an invoice', async () => {
    const { apply } = await import('../repositories/payments/apply')

    await expect(apply(TENANT, PAYMENT, applyParams())).resolves.toEqual({
      data: null,
      error: 'Payment not found.',
      status: 404,
    })

    expect(mocks.mockPrismaRef.current!.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ salesReceipt: { is: null } }),
      })
    )
  })
})
