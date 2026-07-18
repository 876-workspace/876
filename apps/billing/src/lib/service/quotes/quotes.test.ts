import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'
import { deleteQuote } from './delete'
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

function createParams(overrides: Record<string, unknown> = {}) {
  return {
    customerId: 'cus_123',
    lines: [{ description: 'Implementation', quantity: 1, unitAmount: 5_000n }],
    ...overrides,
  } as never
}

const prepared = {
  lines: [
    {
      itemId: null,
      priceId: null,
      description: 'Implementation',
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

describe('quote mutations', () => {
  let quoteCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    quoteCreate = vi.fn().mockResolvedValue({ id: 'qt_123' })
    mocks.prismaRef.current = {
      customer: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'cus_123',
          defaultCurrency: 'USD',
        }),
      },
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ defaultCurrency: 'JMD' }),
      },
      documentPreference: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      quote: {
        delete: vi.fn().mockResolvedValue({ id: 'qt_123' }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: 'qt_123' }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ quote: { create: quoteCreate } })
      ),
    }
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.buildDocumentLines.mockResolvedValue({ data: prepared, error: null })
    mocks.nextDocumentNumber.mockResolvedValue('Q-000042')
    mocks.generateId.mockImplementation((type: string) =>
      type === 'Quote' ? 'qt_123' : 'qtl_123'
    )
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 404 when the customer is missing', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      customer: { findFirst: ReturnType<typeof vi.fn> }
      tenant: { findUnique: ReturnType<typeof vi.fn> }
    }
    prisma.customer.findFirst.mockResolvedValue(null)

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'The selected customer was not found.',
      status: 404,
    })
    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1)
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
  })

  it('returns 404 when the Billing workspace is missing', async () => {
    const tenantModel = (
      mocks.prismaRef.current as unknown as {
        tenant: { findUnique: ReturnType<typeof vi.fn> }
      }
    ).tenant
    tenantModel.findUnique.mockResolvedValue(null)

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'The Billing workspace was not found.',
      status: 404,
    })
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
  })

  it.each([
    [{ currency: 'CAD' }, 'CAD'],
    [{}, 'USD'],
  ])('resolves quote currency from params %j', async (overrides, currency) => {
    const result = await create('ten_123', createParams(overrides))

    expect(result.error).toBeNull()
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith('ten_123', currency)
    expect(mocks.buildDocumentLines).toHaveBeenCalledWith(
      'ten_123',
      currency,
      expect.any(Array)
    )
  })

  it('falls back to tenant currency when customer currency is absent', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).customer
    customer.findFirst.mockResolvedValue({
      id: 'cus_123',
      defaultCurrency: null,
    })

    const result = await create('ten_123', createParams())

    expect(result.error).toBeNull()
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith('ten_123', 'JMD')
  })

  it('rejects a quote currency that is not enabled', async () => {
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Enable the quote currency before using it.',
      status: 422,
    })
    expect(mocks.buildDocumentLines).not.toHaveBeenCalled()
  })

  it('propagates document line validation errors', async () => {
    mocks.buildDocumentLines.mockResolvedValue({
      data: null,
      error: 'Each line needs a description.',
    })

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Each line needs a description.',
      status: 422,
    })
    expect(mocks.nextDocumentNumber).not.toHaveBeenCalled()
  })

  it('creates a draft quote and immutable line snapshots', async () => {
    const params = createParams({
      currency: 'JMD',
      issueAt: 1_783_700_000,
      expiresAt: 1_786_000_000,
      notes: 'Customer note.',
      terms: 'Net 30.',
    })

    const result = await create('ten_123', params)

    expect(result).toEqual({ data: { id: 'qt_123' }, error: null })
    expect(mocks.nextDocumentNumber).toHaveBeenCalledWith(
      'ten_123',
      'QUOTE',
      1_783_771_200
    )
    expect(quoteCreate).toHaveBeenCalledTimes(1)
    expect(quoteCreate).toHaveBeenCalledWith({
      data: {
        id: 'qt_123',
        tenantId: 'ten_123',
        customerId: 'cus_123',
        number: 'Q-000042',
        status: 'DRAFT',
        currency: 'JMD',
        issueAt: 1_783_700_000,
        expiresAt: 1_786_000_000,
        subtotalAmount: 5_000n,
        taxAmount: 750n,
        totalAmount: 5_750n,
        notes: 'Customer note.',
        terms: 'Net 30.',
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
        lines: {
          create: [
            {
              id: 'qtl_123',
              ...prepared.lines[0],
              createdAt: 1_783_771_200,
              updatedAt: 1_783_771_200,
            },
          ],
        },
      },
    })
  })

  it('defaults quote dates and optional text', async () => {
    const result = await create('ten_123', createParams())

    expect(result.error).toBeNull()
    expect(quoteCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issueAt: 1_783_771_200,
        expiresAt: null,
        notes: null,
        terms: null,
      }),
    })
  })

  it('uses the provisioned quote preference unless the request overrides it', async () => {
    const documentPreference = (
      mocks.prismaRef.current as unknown as {
        documentPreference: { findUnique: ReturnType<typeof vi.fn> }
      }
    ).documentPreference
    documentPreference.findUnique.mockResolvedValue({
      customerNote: 'Provisioned note.',
      termsAndConditions: 'Provisioned terms.',
    })

    await create('ten_123', createParams())
    expect(quoteCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        notes: 'Provisioned note.',
        terms: 'Provisioned terms.',
      }),
    })

    await create(
      'ten_123',
      createParams({ notes: null, terms: 'Request terms.' })
    )
    expect(quoteCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ notes: null, terms: 'Request terms.' }),
    })
  })

  it('propagates an unexpected transaction rejection', async () => {
    const transaction = (
      mocks.prismaRef.current as unknown as {
        $transaction: ReturnType<typeof vi.fn>
      }
    ).$transaction
    const error = new Error('database unavailable')
    transaction.mockRejectedValue(error)

    await expect(create('ten_123', createParams())).rejects.toBe(error)
  })

  it('rejects an empty quote update before reading the quote', async () => {
    const quote = (
      mocks.prismaRef.current as unknown as {
        quote: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).quote

    const result = await update('ten_123', 'qt_123', {})

    expect(result).toEqual({
      data: null,
      error: 'Nothing to update.',
      status: 422,
    })
    expect(quote.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ['missing', null, 'Quote not found.', 404],
    [
      'sent',
      { id: 'qt_123', status: 'SENT' },
      'Only draft quotes can be edited.',
      409,
    ],
  ])('rejects update for %s quote', async (_name, current, error, status) => {
    const quote = (
      mocks.prismaRef.current as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).quote
    quote.findFirst.mockResolvedValue(current)

    const result = await update('ten_123', 'qt_123', { notes: 'Updated' })

    expect(result).toEqual({ data: null, error, status })
    expect(quote.update).not.toHaveBeenCalled()
  })

  it('updates every draft quote header including null values', async () => {
    const quote = (
      mocks.prismaRef.current as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).quote
    quote.findFirst.mockResolvedValue({ id: 'qt_123', status: 'DRAFT' })
    const params = {
      issueAt: null,
      expiresAt: null,
      notes: null,
      terms: null,
    }

    const result = await update('ten_123', 'qt_123', params)

    expect(result).toEqual({ data: { id: 'qt_123' }, error: null })
    expect(quote.update).toHaveBeenCalledWith({
      where: { id: 'qt_123' },
      data: { updatedAt: 1_783_771_200, ...params },
    })
  })

  it('returns a safe 500 when quote update throws', async () => {
    const quote = (
      mocks.prismaRef.current as unknown as {
        quote: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).quote
    quote.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await update('ten_123', 'qt_123', { notes: 'Updated' })

    expect(result).toEqual({
      data: null,
      error: 'Failed to update the quote.',
      status: 500,
    })
  })

  it.each([
    ['missing', null, 'Quote not found.', 404],
    [
      'accepted',
      { id: 'qt_123', status: 'ACCEPTED' },
      'Only draft quotes can be deleted.',
      409,
    ],
  ])('rejects deletion for %s quote', async (_name, current, error, status) => {
    const quote = (
      mocks.prismaRef.current as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).quote
    quote.findFirst.mockResolvedValue(current)

    const result = await deleteQuote('ten_123', 'qt_123')

    expect(result).toEqual({ data: null, error, status })
    expect(quote.delete).not.toHaveBeenCalled()
  })

  it('deletes a draft quote', async () => {
    const quote = (
      mocks.prismaRef.current as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).quote
    quote.findFirst.mockResolvedValue({ id: 'qt_123', status: 'DRAFT' })

    const result = await deleteQuote('ten_123', 'qt_123')

    expect(result).toEqual({ data: { id: 'qt_123' }, error: null })
    expect(quote.delete).toHaveBeenCalledWith({ where: { id: 'qt_123' } })
  })

  it('returns a safe 500 when quote deletion throws', async () => {
    const quote = (
      mocks.prismaRef.current as unknown as {
        quote: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).quote
    quote.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await deleteQuote('ten_123', 'qt_123')

    expect(result).toEqual({
      data: null,
      error: 'Failed to delete the quote.',
      status: 500,
    })
  })
})
