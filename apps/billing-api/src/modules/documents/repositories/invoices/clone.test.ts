import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { invoice: { findFirst: mocks.findFirst } },
}))
vi.mock('./create', () => ({ create: mocks.create }))

import { clone } from './clone'

const tenantId = 'ten_kingston_01'
const invoiceId = 'in_7Hk2Qm4Z'

function sourceInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: invoiceId,
    tenantId,
    customerId: 'cus_9fK2mQ8x',
    currency: 'JMD',
    number: 'INV-000007',
    status: 'OPEN',
    quoteId: 'q_2Ld9Vm1P',
    subscriptionId: 'sub_5Tr8Wq3N',
    recurringInvoiceId: 'rinv_4Bn6Yz7C',
    salespersonId: 'sp_1Fv3Kd8R',
    priceListId: 'pl_6Hj2Ls4T',
    taxBehavior: 'INCLUSIVE',
    notes: 'Pay on receipt.',
    terms: 'Net 30',
    discountAmount: 1_000n,
    shippingAmount: 500n,
    adjustmentAmount: -250n,
    amountPaid: 900n,
    amountCredited: 400n,
    amountWrittenOff: 100n,
    sentAt: 1_700_000_000,
    paidAt: 1_700_000_100,
    issueAt: 1_699_000_000,
    dueAt: 1_699_500_000,
    lines: [
      {
        id: 'invl_1',
        itemId: 'item_1',
        variantId: null,
        priceId: 'price_1',
        description: 'Monthly retainer',
        quantity: 2,
        unitAmount: 250_000n,
        taxAmount: 25_000n,
        discountAmount: 5_000n,
        totalAmount: 270_000n,
        position: 0,
      },
    ],
    ...overrides,
  }
}

describe('invoice clone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findFirst.mockResolvedValue(sourceInvoice())
    mocks.create.mockResolvedValue({
      data: { id: 'in_cloned_1' },
      error: null,
    })
  })

  it('creates the clone through the canonical create path', async () => {
    // ARRANGE — the source invoice is the only fixture the clone reads.

    // ACT
    const result = await clone(tenantId, invoiceId)

    // ASSERT
    expect(result).toEqual({ data: { id: 'in_cloned_1' }, error: null })
    expect(mocks.create).toHaveBeenCalledTimes(1)

    // AFTER — no teardown needed; vi.clearAllMocks runs in beforeEach.
  })

  it('passes the source document fields and nothing else to the create path', async () => {
    // ARRANGE — the source carries a quote, subscription, recurrence, payments
    // and lifecycle stamps that a clone must not inherit.

    // ACT
    await clone(tenantId, invoiceId)

    // ASSERT — exact equality is the point: an extra copied field fails here.
    expect(mocks.create).toHaveBeenCalledWith(tenantId, {
      customerId: 'cus_9fK2mQ8x',
      currency: 'JMD',
      salespersonId: 'sp_1Fv3Kd8R',
      priceListId: 'pl_6Hj2Ls4T',
      taxBehavior: 'INCLUSIVE',
      notes: 'Pay on receipt.',
      terms: 'Net 30',
      discountAmount: 1_000n,
      shippingAmount: 500n,
      adjustmentAmount: -250n,
      lines: [
        {
          itemId: 'item_1',
          variantId: null,
          priceId: 'price_1',
          description: 'Monthly retainer',
          quantity: 2,
          unitAmount: 250_000n,
          taxAmount: 25_000n,
          discountAmount: 5_000n,
        },
      ],
    })

    // AFTER — no teardown needed; vi.clearAllMocks runs in beforeEach.
  })

  it('leaves the number, dates and lifecycle stamps to the create path', async () => {
    // ARRANGE — the create path allocates the number and stamps the dates.

    // ACT
    await clone(tenantId, invoiceId)

    // ASSERT
    const [, params] = mocks.create.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(Object.keys(params).toSorted()).toEqual([
      'adjustmentAmount',
      'currency',
      'customerId',
      'discountAmount',
      'lines',
      'notes',
      'priceListId',
      'salespersonId',
      'shippingAmount',
      'taxBehavior',
      'terms',
    ])

    // AFTER — no teardown needed; vi.clearAllMocks runs in beforeEach.
  })

  it('does not carry payments, credits or write-offs onto the clone', async () => {
    // ARRANGE — the source has been partially paid and credited.

    // ACT
    await clone(tenantId, invoiceId)

    // ASSERT
    const [, params] = mocks.create.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(params).not.toHaveProperty('amountPaid')
    expect(params).not.toHaveProperty('amountCredited')
    expect(params).not.toHaveProperty('amountWrittenOff')
    expect(params).not.toHaveProperty('paidAt')
    expect(params).not.toHaveProperty('sentAt')

    // AFTER — no teardown needed; vi.clearAllMocks runs in beforeEach.
  })

  it('preserves the source line order when rebuilding the payload', async () => {
    // ARRANGE — position order, not insertion order, defines the document.
    mocks.findFirst.mockResolvedValue(
      sourceInvoice({
        lines: [
          { ...sourceInvoice().lines[0], id: 'invl_1', position: 0 },
          {
            ...sourceInvoice().lines[0],
            id: 'invl_2',
            description: 'Onboarding',
            position: 1,
          },
        ],
      })
    )

    // ACT
    await clone(tenantId, invoiceId)

    // ASSERT
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: invoiceId, tenantId },
      include: { lines: { orderBy: { position: 'asc' } } },
    })
    const [, params] = mocks.create.mock.calls[0] as [
      string,
      { lines: Array<{ description: string }> },
    ]
    expect(params.lines.map((line) => line.description)).toEqual([
      'Monthly retainer',
      'Onboarding',
    ])

    // AFTER — no teardown needed; vi.clearAllMocks runs in beforeEach.
  })

  it('reports a source invoice the tenant does not own without creating one', async () => {
    // ARRANGE — the lookup is tenant-scoped, so another tenant sees nothing.
    mocks.findFirst.mockResolvedValue(null)

    // ACT
    const result = await clone('ten_other', invoiceId)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'Invoice not found.',
      status: 404,
    })
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: invoiceId, tenantId: 'ten_other' },
      include: { lines: { orderBy: { position: 'asc' } } },
    })
    expect(mocks.create).not.toHaveBeenCalled()

    // AFTER — no teardown needed; vi.clearAllMocks runs in beforeEach.
  })

  it('returns the create path failure unchanged instead of a clone', async () => {
    // ARRANGE — the create path rejects the cloned document.
    mocks.create.mockResolvedValue({
      data: null,
      error: 'The invoice discount cannot exceed its subtotal.',
      status: 422,
    })

    // ACT
    const result = await clone(tenantId, invoiceId)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'The invoice discount cannot exceed its subtotal.',
      status: 422,
    })

    // AFTER — no teardown needed; vi.clearAllMocks runs in beforeEach.
  })
})
