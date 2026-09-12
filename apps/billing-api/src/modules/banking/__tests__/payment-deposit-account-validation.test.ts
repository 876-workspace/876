import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadPaymentTargets } from '@/modules/payments'

const mocks = vi.hoisted(() => ({
  customerFindFirst: vi.fn(),
  paymentModeFindFirst: vi.fn(),
  bankAccountFindFirst: vi.fn(),
  invoiceFindMany: vi.fn(),
}))

type PaymentTargetsTx = Parameters<typeof loadPaymentTargets>[0]

function stubTx(): PaymentTargetsTx {
  return {
    customer: { findFirst: mocks.customerFindFirst },
    paymentMode: { findFirst: mocks.paymentModeFindFirst },
    bankAccount: { findFirst: mocks.bankAccountFindFirst },
    invoice: { findMany: mocks.invoiceFindMany },
  } as unknown as PaymentTargetsTx
}

const params = {
  customerId: 'cust_1',
  paymentModeId: 'mode_1',
  depositAccountId: 'acct_1',
  amount: 100n,
  bankCharges: 0n,
  currency: 'USD',
  paymentDate: 1_700_000_000,
  referenceNumber: null,
  notes: null,
  allocations: [],
}

describe('payment deposit-account validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.customerFindFirst.mockResolvedValue({ id: 'cust_1' })
    mocks.paymentModeFindFirst.mockResolvedValue({ id: 'mode_1' })
    mocks.bankAccountFindFirst.mockResolvedValue({ id: 'acct_1', currency: 'USD' })
    mocks.invoiceFindMany.mockResolvedValue([])
  })

  it('rejects an inactive deposit account', async () => {
    mocks.bankAccountFindFirst.mockResolvedValue(null)

    await expect(loadPaymentTargets(stubTx(), 'ten_1', params)).rejects.toMatchObject({
      name: 'PaymentMutationError',
      message: 'Active deposit account not found.',
      status: 404,
    })
    expect(mocks.invoiceFindMany).toHaveBeenCalledTimes(1)
  })

  it('rejects a deposit account with a different currency', async () => {
    mocks.bankAccountFindFirst.mockResolvedValue({ id: 'acct_1', currency: 'JMD' })

    await expect(loadPaymentTargets(stubTx(), 'ten_1', params)).rejects.toMatchObject({
      name: 'PaymentMutationError',
      message: 'The deposit account uses a different currency.',
      status: 422,
    })
    expect(mocks.bankAccountFindFirst).toHaveBeenCalledWith({
      where: { id: 'acct_1', tenantId: 'ten_1', isActive: true },
      select: { id: true, currency: true },
    })
  })
})
