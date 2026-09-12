import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  preferenceFindUnique: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
  transaction: vi.fn(),
  buildDocumentLines: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 1_700_000_000 }))
vi.mock('@/platform/ids', () => ({ generateId: () => 'il_new' }))
vi.mock('@/db/client', () => ({
  prisma: {
    invoice: { findFirst: mocks.findFirst, update: mocks.update },
    invoicePreference: { findUnique: mocks.preferenceFindUnique },
    $transaction: mocks.transaction,
  },
}))
vi.mock('../documents/lines', () => ({
  buildDocumentLines: mocks.buildDocumentLines,
}))

import { InvoiceUpdateSchema } from '../../schemas/invoice'
import { update } from './update'

const tenantId = 'ten_123'
const invoiceId = 'in_123'
const replacementLines = [
  {
    description: 'Consulting',
    quantity: 2,
    unitAmount: 12_500n,
    taxAmount: 0n,
    discountAmount: 0n,
  },
]

function draft(status = 'DRAFT') {
  return {
    id: invoiceId,
    status,
    currency: 'JMD',
    priceListId: null,
    discountAmount: 0n,
    shippingAmount: 0n,
    adjustmentAmount: 0n,
  }
}

describe('invoice update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findFirst.mockResolvedValue(draft())
    mocks.preferenceFindUnique.mockResolvedValue(null)
    mocks.buildDocumentLines.mockResolvedValue({
      data: {
        subtotalAmount: 25_000n,
        taxAmount: 0n,
        lineAmounts: [
          { subtotalAmount: 25_000n, taxAmount: 0n, discountAmount: 0n },
        ],
        lines: [
          {
            description: 'Consulting',
            quantity: 2,
            unitAmount: 12_500n,
            taxAmount: 0n,
            discountAmount: 0n,
          },
        ],
      },
      error: null,
    })
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        invoiceLine: { deleteMany: mocks.deleteMany },
        invoice: { update: mocks.update },
      })
    )
  })

  it('accepts the create-line schema for a replacement array', () => {
    expect(
      InvoiceUpdateSchema.parse({
        lines: [
          {
            description: 'Consulting',
            quantity: 2,
            unitAmount: '12500',
            taxAmount: '0',
            discountAmount: '0',
          },
        ],
      })
    ).toEqual({
      lines: [
        {
          description: 'Consulting',
          quantity: 2,
          unitAmount: 12_500n,
          taxAmount: 0n,
          discountAmount: 0n,
        },
      ],
    })
  })

  it('rejects a malformed replacement line at the request boundary', () => {
    expect(() =>
      InvoiceUpdateSchema.parse({ lines: [{ description: '', quantity: 0 }] })
    ).toThrow()
  })

  it('rejects an empty replacement array at the request boundary', () => {
    expect(() => InvoiceUpdateSchema.parse({ lines: [] })).toThrow()
  })

  it('replaces draft lines and recomputes all persisted totals', async () => {
    const result = await update(tenantId, invoiceId, {
      lines: replacementLines,
    })

    expect(result).toEqual({ data: { id: invoiceId }, error: null })
    expect(mocks.buildDocumentLines).toHaveBeenCalledWith(
      tenantId,
      'JMD',
      replacementLines,
      null
    )
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { invoiceId } })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: invoiceId },
        data: expect.objectContaining({
          subtotalAmount: 25_000n,
          taxAmount: 0n,
          totalAmount: 25_000n,
          amountDue: 25_000n,
        }),
      })
    )
  })

  it('keeps existing lines untouched for a draft metadata-only update', async () => {
    const result = await update(tenantId, invoiceId, { notes: 'Revised note' })

    expect(result).toEqual({ data: { id: invoiceId }, error: null })
    expect(mocks.buildDocumentLines).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: invoiceId },
      data: { updatedAt: 1_700_000_000, notes: 'Revised note' },
    })
  })

  it('preserves the existing metadata-only update for an editable sent invoice', async () => {
    mocks.findFirst.mockResolvedValue(draft('SENT'))
    mocks.preferenceFindUnique.mockResolvedValue({
      allowEditingSentInvoices: true,
    })

    const result = await update(tenantId, invoiceId, {
      referenceNumber: 'PO-22',
    })

    expect(result).toEqual({ data: { id: invoiceId }, error: null })
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: invoiceId },
      data: { updatedAt: 1_700_000_000, referenceNumber: 'PO-22' },
    })
  })

  it('rejects a sent invoice line replacement even when sent metadata edits are enabled', async () => {
    mocks.findFirst.mockResolvedValue(draft('SENT'))
    mocks.preferenceFindUnique.mockResolvedValue({
      allowEditingSentInvoices: true,
    })

    await expect(
      update(tenantId, invoiceId, { lines: replacementLines })
    ).resolves.toEqual({
      data: null,
      error: 'Only draft invoices can have their line items changed.',
      status: 409,
    })
    expect(mocks.buildDocumentLines).not.toHaveBeenCalled()
  })

  it.each([
    'OPEN',
    'PARTIALLY_PAID',
    'OVERDUE',
    'PAID',
    'UNCOLLECTIBLE',
    'VOID',
  ])('rejects a %s invoice line replacement', async (status) => {
    mocks.findFirst.mockResolvedValue(draft(status))

    await expect(
      update(tenantId, invoiceId, { lines: replacementLines })
    ).resolves.toEqual({
      data: null,
      error: 'This invoice can no longer be edited.',
      status: 409,
    })
    expect(mocks.buildDocumentLines).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('does not allow another tenant to replace an invoice line set', async () => {
    mocks.findFirst.mockResolvedValue(null)

    await expect(
      update('ten_other', invoiceId, { lines: replacementLines })
    ).resolves.toEqual({ data: null, error: 'Invoice not found.', status: 404 })
    expect(mocks.buildDocumentLines).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('does not delete old lines when line preparation returns a validation error', async () => {
    mocks.buildDocumentLines.mockResolvedValue({
      data: null,
      error: 'Line amount is invalid.',
    })

    await expect(
      update(tenantId, invoiceId, { lines: replacementLines })
    ).resolves.toEqual({
      data: null,
      error: 'Line amount is invalid.',
      status: 422,
    })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('rejects an empty update before reading the tenant invoice', async () => {
    await expect(update(tenantId, invoiceId, {})).resolves.toEqual({
      data: null,
      error: 'Nothing to update.',
      status: 422,
    })
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })
})
