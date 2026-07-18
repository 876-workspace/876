import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'
import { deleteInvoice } from './delete'
import { update } from './update'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  hasEnabledCurrency: vi.fn(),
  buildDocumentLines: vi.fn(),
  nextDocumentNumber: vi.fn(),
  generateId: vi.fn(),
  nowUnixSeconds: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))
vi.mock('@/lib/id', () => ({ generateId: mocks.generateId }))
vi.mock('@876/core/timestamps', () => ({
  nowUnixSeconds: mocks.nowUnixSeconds,
}))
vi.mock('../shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared')>()
  return { ...actual, hasEnabledCurrency: mocks.hasEnabledCurrency }
})
vi.mock('../documents/lines', () => ({
  buildDocumentLines: mocks.buildDocumentLines,
}))
vi.mock('../documents/numbers', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))

const sourceLine = {
  id: 'qtl_123',
  itemId: 'item_123',
  priceId: 'prc_123',
  description: 'Implementation',
  quantity: 1,
  unitAmount: 5_000n,
  taxAmount: 750n,
  discountAmount: 0n,
  totalAmount: 5_750n,
}

const prepared = {
  lines: [
    {
      itemId: 'item_123',
      priceId: 'prc_123',
      description: 'Implementation',
      unit: null,
      quantity: 1,
      unitAmount: 5_000n,
      taxAmount: 750n,
      discountAmount: 0n,
      totalAmount: 5_750n,
    },
  ],
  subtotalAmount: 5_000n,
  taxAmount: 750n,
  totalAmount: 5_750n,
}

function manualParams(overrides: Record<string, unknown> = {}) {
  return {
    customerId: 'cus_123',
    lines: [{ description: 'Implementation', quantity: 1, unitAmount: 5_000n }],
    ...overrides,
  } as never
}

function quoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'qt_123',
    customerId: 'cus_123',
    status: 'ACCEPTED',
    currency: 'JMD',
    subtotalAmount: 5_000n,
    taxAmount: 750n,
    totalAmount: 5_750n,
    notes: 'Quote note.',
    terms: 'Net 30.',
    lines: [sourceLine],
    convertedInvoice: null,
    ...overrides,
  }
}

describe('invoice mutations', () => {
  let invoiceCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    invoiceCreate = vi.fn().mockResolvedValue({ id: 'inv_123' })
    const invoice = {
      delete: vi.fn().mockResolvedValue({ id: 'inv_123' }),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: 'inv_123' }),
    }
    const subscriptionCharge = {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    }
    const subscriptionBillingRun = {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    }
    const subscription = {
      findFirst: vi.fn().mockResolvedValue({
        id: 'sub_123',
        customerId: 'cus_123',
      }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    }
    mocks.prismaRef.current = {
      customer: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'cus_123',
          name: 'Efesto Technologies',
          email: 'billing@efesto.example',
          defaultCurrency: 'USD',
          taxBehaviorOverride: null,
          invoiceNotes: null,
          invoiceTerms: null,
          addresses: [],
        }),
      },
      invoicePreference: {
        findUnique: vi.fn().mockResolvedValue({
          defaultTaxBehavior: 'EXCLUSIVE',
          defaultNotes: null,
          defaultTerms: null,
          allowEditingSentInvoices: false,
        }),
      },
      documentPreference: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ defaultCurrency: 'JMD' }),
      },
      subscription,
      quote: { findFirst: vi.fn().mockResolvedValue(null) },
      invoice,
      subscriptionCharge,
      subscriptionBillingRun,
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          invoice: { ...invoice, create: invoiceCreate },
          subscriptionCharge,
          subscriptionBillingRun,
          subscription,
        })
      ),
    }
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.buildDocumentLines.mockResolvedValue({ data: prepared, error: null })
    mocks.nextDocumentNumber.mockResolvedValue('INV-000042')
    mocks.generateId.mockImplementation((type: string) =>
      type === 'Invoice' ? 'inv_123' : 'invl_123'
    )
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    [{ quoteId: 'qt_missing' }, null, 'The selected quote was not found.', 404],
    [
      { quoteId: 'qt_123' },
      quoteRow({ convertedInvoice: { id: 'inv_existing' } }),
      'This quote already has an invoice.',
      409,
    ],
    [
      { quoteId: 'qt_123' },
      quoteRow({ status: 'CANCELED' }),
      'This quote cannot be converted to an invoice.',
      422,
    ],
    [
      { quoteId: 'qt_123' },
      quoteRow({ status: 'DECLINED' }),
      'This quote cannot be converted to an invoice.',
      422,
    ],
  ])(
    'rejects invalid quote conversion %#',
    async (params, quote, error, status) => {
      const quoteModel = (
        mocks.prismaRef.current as unknown as {
          quote: { findFirst: ReturnType<typeof vi.fn> }
        }
      ).quote
      quoteModel.findFirst.mockResolvedValue(quote)

      const result = await create('ten_123', params as never)

      expect(result).toEqual({ data: null, error, status })
      expect(invoiceCreate).not.toHaveBeenCalled()
    }
  )

  it('copies an accepted quote snapshot into a draft invoice', async () => {
    const quoteModel = (
      mocks.prismaRef.current as unknown as {
        quote: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).quote
    quoteModel.findFirst.mockResolvedValue(quoteRow())
    const params = {
      quoteId: 'qt_123',
      issueAt: 1_783_700_000,
      dueAt: 1_786_000_000,
      notes: 'Invoice note.',
      terms: 'Due on receipt.',
    } as never

    const result = await create('ten_123', params)

    expect(result).toEqual({ data: { id: 'inv_123' }, error: null })
    expect(mocks.nextDocumentNumber).toHaveBeenCalledWith(
      'ten_123',
      'INVOICE',
      1_783_771_200
    )
    expect(invoiceCreate).toHaveBeenCalledWith({
      data: {
        id: 'inv_123',
        tenantId: 'ten_123',
        customerId: 'cus_123',
        quoteId: 'qt_123',
        salespersonId: null,
        number: 'INV-000042',
        status: 'DRAFT',
        billingReason: 'QUOTE',
        currency: 'JMD',
        issueAt: 1_783_700_000,
        dueAt: 1_786_000_000,
        subtotalAmount: 5_000n,
        taxAmount: 750n,
        totalAmount: 5_750n,
        amountDue: 5_750n,
        orderNumber: null,
        referenceNumber: null,
        subject: null,
        taxBehavior: 'EXCLUSIVE',
        customerName: 'Efesto Technologies',
        customerEmail: 'billing@efesto.example',
        billingAddressSnapshot: undefined,
        shippingAddressSnapshot: undefined,
        notes: 'Invoice note.',
        terms: 'Due on receipt.',
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
        lines: {
          create: [
            {
              id: 'invl_123',
              itemId: 'item_123',
              priceId: 'prc_123',
              description: 'Implementation',
              position: 0,
              quantity: 1,
              unitAmount: 5_000n,
              taxAmount: 750n,
              discountAmount: 0n,
              totalAmount: 5_750n,
              createdAt: 1_783_771_200,
              updatedAt: 1_783_771_200,
            },
          ],
        },
      },
    })
    expect(mocks.buildDocumentLines).not.toHaveBeenCalled()
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
  })

  it('defaults quote conversion headers from the source quote', async () => {
    const quoteModel = (
      mocks.prismaRef.current as unknown as {
        quote: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).quote
    quoteModel.findFirst.mockResolvedValue(quoteRow())

    const result = await create('ten_123', { quoteId: 'qt_123' } as never)

    expect(result.error).toBeNull()
    expect(invoiceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issueAt: 1_783_771_200,
        dueAt: null,
        notes: 'Quote note.',
        terms: 'Net 30.',
      }),
    })
  })

  it.each([
    ['missing customer', { lines: [] }],
    ['missing lines', { customerId: 'cus_123' }],
  ])('rejects manual invoice with %s', async (_name, params) => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).customer

    const result = await create('ten_123', params as never)

    expect(result).toEqual({
      data: null,
      error: 'A manual invoice needs a customer and at least one line.',
      status: 422,
    })
    expect(customer.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ['customer', 'customer', null, 'The selected customer was not found.'],
    ['tenant', 'tenant', null, 'The Billing workspace was not found.'],
  ])(
    'returns 404 when manual invoice %s is missing',
    async (_name, model, value, error) => {
      const prisma = mocks.prismaRef.current as unknown as {
        customer: { findFirst: ReturnType<typeof vi.fn> }
        tenant: { findUnique: ReturnType<typeof vi.fn> }
      }
      if (model === 'customer')
        prisma.customer.findFirst.mockResolvedValue(value)
      else prisma.tenant.findUnique.mockResolvedValue(value)

      const result = await create('ten_123', manualParams())

      expect(result).toEqual({ data: null, error, status: 404 })
      expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
    }
  )

  it('returns 404 when a selected subscription is missing', async () => {
    const subscription = (
      mocks.prismaRef.current as unknown as {
        subscription: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).subscription
    subscription.findFirst.mockResolvedValue(null)

    const result = await create(
      'ten_123',
      manualParams({ subscriptionId: 'sub_missing' })
    )

    expect(result).toEqual({
      data: null,
      error: 'The selected subscription was not found.',
      status: 404,
    })
  })

  it('rejects a subscription belonging to another customer', async () => {
    const subscription = (
      mocks.prismaRef.current as unknown as {
        subscription: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).subscription
    subscription.findFirst.mockResolvedValue({
      id: 'sub_123',
      customerId: 'cus_other',
    })

    const result = await create(
      'ten_123',
      manualParams({ subscriptionId: 'sub_123' })
    )

    expect(result).toEqual({
      data: null,
      error: 'The subscription belongs to a different customer.',
      status: 422,
    })
  })

  it.each([
    [{ currency: 'CAD' }, 'CAD'],
    [{}, 'USD'],
  ])(
    'resolves manual invoice currency from params %j',
    async (overrides, currency) => {
      const result = await create('ten_123', manualParams(overrides))

      expect(result.error).toBeNull()
      expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith('ten_123', currency)
      expect(mocks.buildDocumentLines).toHaveBeenCalledWith(
        'ten_123',
        currency,
        expect.any(Array)
      )
    }
  )

  it('falls back to tenant currency when customer currency is absent', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).customer
    customer.findFirst.mockResolvedValue({
      id: 'cus_123',
      name: 'Efesto Technologies',
      email: null,
      defaultCurrency: null,
      taxBehaviorOverride: null,
      invoiceNotes: null,
      invoiceTerms: null,
      addresses: [],
    })

    const result = await create('ten_123', manualParams())

    expect(result.error).toBeNull()
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith('ten_123', 'JMD')
  })

  it('rejects a disabled invoice currency', async () => {
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await create('ten_123', manualParams())

    expect(result).toEqual({
      data: null,
      error: 'Enable the invoice currency before using it.',
      status: 422,
    })
    expect(mocks.buildDocumentLines).not.toHaveBeenCalled()
  })

  it('propagates manual line validation errors', async () => {
    mocks.buildDocumentLines.mockResolvedValue({
      data: null,
      error: 'Each line needs a description.',
    })

    const result = await create('ten_123', manualParams())

    expect(result).toEqual({
      data: null,
      error: 'Each line needs a description.',
      status: 422,
    })
    expect(mocks.nextDocumentNumber).not.toHaveBeenCalled()
  })

  it('creates a manual invoice linked to a subscription', async () => {
    const params = manualParams({
      subscriptionId: 'sub_123',
      currency: 'JMD',
      issueAt: 1_783_700_000,
      dueAt: 1_786_000_000,
      notes: 'Invoice note.',
      terms: 'Net 30.',
    })

    const result = await create('ten_123', params)

    expect(result).toEqual({ data: { id: 'inv_123' }, error: null })
    expect(invoiceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'inv_123',
        tenantId: 'ten_123',
        customerId: 'cus_123',
        subscriptionId: 'sub_123',
        number: 'INV-000042',
        status: 'DRAFT',
        currency: 'JMD',
        issueAt: 1_783_700_000,
        dueAt: 1_786_000_000,
        subtotalAmount: 5_000n,
        taxAmount: 750n,
        discountAmount: 0n,
        shippingAmount: 0n,
        adjustmentAmount: 0n,
        totalAmount: 5_750n,
        amountDue: 5_750n,
        notes: 'Invoice note.',
        terms: 'Net 30.',
        lines: {
          create: [
            {
              id: 'invl_123',
              ...prepared.lines[0],
              position: 0,
              createdAt: 1_783_771_200,
              updatedAt: 1_783_771_200,
            },
          ],
        },
      }),
    })
  })

  it('defaults manual invoice subscription and optional headers', async () => {
    const result = await create('ten_123', manualParams())

    expect(result.error).toBeNull()
    expect(invoiceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: null,
        issueAt: 1_783_771_200,
        dueAt: null,
        notes: null,
        terms: null,
      }),
    })
  })

  it('returns a safe error for an unexpected invoice transaction rejection', async () => {
    const transaction = (
      mocks.prismaRef.current as unknown as {
        $transaction: ReturnType<typeof vi.fn>
      }
    ).$transaction
    const error = new Error('database unavailable')
    transaction.mockRejectedValue(error)

    await expect(create('ten_123', manualParams())).resolves.toEqual({
      data: null,
      error: 'Failed to create the invoice.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledWith(
      '[billing.service.invoices.create]',
      error
    )
  })

  it('rejects an empty invoice update before reading the invoice', async () => {
    const invoice = (
      mocks.prismaRef.current as unknown as {
        invoice: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).invoice

    const result = await update('ten_123', 'inv_123', {})

    expect(result).toEqual({
      data: null,
      error: 'Nothing to update.',
      status: 422,
    })
    expect(invoice.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ['missing', null, 'Invoice not found.', 404],
    [
      'sent',
      { id: 'inv_123', status: 'SENT' },
      'This invoice can no longer be edited.',
      409,
    ],
  ])('rejects update for %s invoice', async (_name, current, error, status) => {
    const invoice = (
      mocks.prismaRef.current as unknown as {
        invoice: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).invoice
    invoice.findFirst.mockResolvedValue(current)

    const result = await update('ten_123', 'inv_123', { notes: 'Updated' })

    expect(result).toEqual({ data: null, error, status })
    expect(invoice.update).not.toHaveBeenCalled()
  })

  it('updates every draft invoice header including null values', async () => {
    const invoice = (
      mocks.prismaRef.current as unknown as {
        invoice: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).invoice
    invoice.findFirst.mockResolvedValue({ id: 'inv_123', status: 'DRAFT' })
    const params = {
      issueAt: null,
      dueAt: null,
      notes: null,
      terms: null,
      orderNumber: null,
      referenceNumber: null,
      subject: null,
    }

    const result = await update('ten_123', 'inv_123', params)

    expect(result).toEqual({ data: { id: 'inv_123' }, error: null })
    expect(invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv_123' },
      data: { updatedAt: 1_783_771_200, ...params },
    })
  })

  it('returns a safe 500 when invoice update throws', async () => {
    const invoice = (
      mocks.prismaRef.current as unknown as {
        invoice: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).invoice
    invoice.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await update('ten_123', 'inv_123', { notes: 'Updated' })

    expect(result).toEqual({
      data: null,
      error: 'Failed to update the invoice.',
      status: 500,
    })
  })

  it.each([
    ['missing', null, 'Invoice not found.', 404],
    [
      'paid',
      { id: 'inv_123', status: 'PAID' },
      'Only draft invoices can be deleted.',
      409,
    ],
  ])(
    'rejects deletion for %s invoice',
    async (_name, current, error, status) => {
      const invoice = (
        mocks.prismaRef.current as unknown as {
          invoice: {
            findFirst: ReturnType<typeof vi.fn>
            delete: ReturnType<typeof vi.fn>
          }
        }
      ).invoice
      invoice.findFirst.mockResolvedValue(current)

      const result = await deleteInvoice('ten_123', 'inv_123')

      expect(result).toEqual({ data: null, error, status })
      expect(invoice.delete).not.toHaveBeenCalled()
    }
  )

  it('deletes a draft invoice', async () => {
    const database = mocks.prismaRef.current as unknown as {
      invoice: {
        findFirst: ReturnType<typeof vi.fn>
        delete: ReturnType<typeof vi.fn>
      }
      subscriptionCharge: { updateMany: ReturnType<typeof vi.fn> }
      subscriptionBillingRun: { deleteMany: ReturnType<typeof vi.fn> }
    }
    const invoice = database.invoice
    invoice.findFirst.mockResolvedValue({ id: 'inv_123', status: 'DRAFT' })

    const result = await deleteInvoice('ten_123', 'inv_123')

    expect(result).toEqual({ data: { id: 'inv_123' }, error: null })
    expect(invoice.delete).toHaveBeenCalledWith({ where: { id: 'inv_123' } })
    expect(database.subscriptionCharge.updateMany).toHaveBeenCalledWith({
      where: { invoiceId: 'inv_123', status: 'INVOICED' },
      data: expect.objectContaining({ status: 'UNBILLED', invoiceId: null }),
    })
    expect(database.subscriptionBillingRun.deleteMany).toHaveBeenCalledWith({
      where: { invoiceId: 'inv_123' },
    })
  })

  it('restores advance scheduling when a draft advance invoice is deleted', async () => {
    const database = mocks.prismaRef.current as unknown as {
      invoice: { findFirst: ReturnType<typeof vi.fn> }
      subscriptionBillingRun: { findMany: ReturnType<typeof vi.fn> }
      subscription: {
        findMany: ReturnType<typeof vi.fn>
        update: ReturnType<typeof vi.fn>
      }
    }
    database.invoice.findFirst.mockResolvedValue({
      id: 'inv_123',
      status: 'DRAFT',
    })
    database.subscriptionBillingRun.findMany.mockResolvedValue([
      { subscriptionId: 'sub_123' },
    ])
    database.subscription.findMany.mockResolvedValue([
      {
        id: 'sub_123',
        status: 'ACTIVE',
        nextBillingAt: 1_784_000_000,
        advanceBillingEnabled: true,
        advanceBillingDays: 2,
      },
    ])

    await expect(deleteInvoice('ten_123', 'inv_123')).resolves.toEqual({
      data: { id: 'inv_123' },
      error: null,
    })
    expect(database.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_123' },
      data: {
        nextAdvanceInvoiceAt: 1_783_827_200,
        updatedAt: 1_783_771_200,
      },
    })
  })

  it('returns a safe 500 when invoice deletion throws', async () => {
    const invoice = (
      mocks.prismaRef.current as unknown as {
        invoice: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).invoice
    invoice.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await deleteInvoice('ten_123', 'inv_123')

    expect(result).toEqual({
      data: null,
      error: 'Failed to delete the invoice.',
      status: 500,
    })
  })
})
