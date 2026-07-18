import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  recordLedgerEntry: vi.fn(),
  recomputeCustomerAr: vi.fn(),
}))

vi.mock('../ledger', () => ({ recordLedgerEntry: mocks.recordLedgerEntry }))
vi.mock('../customers/ar', () => ({
  recomputeCustomerAr: mocks.recomputeCustomerAr,
}))

import {
  AdvanceInvoiceConflict,
  invalidateAdvanceInvoices,
} from './advance-invoices'

function transaction(invoice: Record<string, unknown>) {
  return {
    subscriptionBillingRun: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: 'run_1', invoice: { ...invoice } }]),
      delete: vi.fn().mockResolvedValue({}),
    },
    subscriptionCharge: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    subscription: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'sub_1',
          status: 'ACTIVE',
          nextBillingAt: 1_700_500_000,
          advanceBillingEnabled: true,
          advanceBillingDays: 2,
        },
      ]),
      update: vi.fn().mockResolvedValue({}),
    },
    invoice: { update: vi.fn().mockResolvedValue({}) },
  }
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv_1',
    tenantId: 'ten_1',
    customerId: 'cus_1',
    number: 'INV-1',
    currency: 'JMD',
    status: 'OPEN',
    amountDue: 10_000n,
    amountPaid: 0n,
    amountCredited: 0n,
    allocations: [],
    creditNoteAllocations: [],
    subscriptionLinks: [{ subscriptionId: 'sub_1' }],
    ...overrides,
  }
}

describe('invalidateAdvanceInvoices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('voids an unsettled invoice, restores charges, and releases the period', async () => {
    const tx = transaction(invoice())

    await invalidateAdvanceInvoices(
      tx as never,
      'ten_1',
      'sub_1',
      1_700_000_000,
      'Terms changed'
    )

    expect(tx.subscriptionCharge.updateMany).toHaveBeenCalledWith({
      where: {
        subscriptionId: 'sub_1',
        invoiceId: 'inv_1',
        status: 'INVOICED',
      },
      data: expect.objectContaining({ status: 'UNBILLED', invoiceId: null }),
    })
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv_1' },
      data: expect.objectContaining({ status: 'VOID', amountDue: 0n }),
    })
    expect(tx.subscriptionBillingRun.delete).toHaveBeenCalledWith({
      where: { id: 'run_1' },
    })
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        type: 'INVOICE_VOIDED',
        amount: 10_000n,
      })
    )
    expect(mocks.recomputeCustomerAr).toHaveBeenCalledWith(
      tx,
      'ten_1',
      'cus_1',
      1_700_000_000
    )
  })

  it('does not post a ledger reversal for a draft advance invoice', async () => {
    const tx = transaction(invoice({ status: 'DRAFT' }))

    await invalidateAdvanceInvoices(
      tx as never,
      'ten_1',
      'sub_1',
      1_700_000_000,
      'Canceled'
    )

    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled()
  })

  it('blocks changes when the advance invoice has settlements', async () => {
    const tx = transaction(invoice({ amountPaid: 5_000n }))

    await expect(
      invalidateAdvanceInvoices(
        tx as never,
        'ten_1',
        'sub_1',
        1_700_000_000,
        'Canceled'
      )
    ).rejects.toBeInstanceOf(AdvanceInvoiceConflict)
    expect(tx.invoice.update).not.toHaveBeenCalled()
    expect(tx.subscriptionBillingRun.delete).not.toHaveBeenCalled()
  })
})
