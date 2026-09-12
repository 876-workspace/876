import { describe, expect, it, vi } from 'vitest'

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }))

vi.mock('@/db/client', () => ({ prisma: { invoice: { findFirst } } }))

import { serializeDocument } from '../documents.serializers'
import { retrieve } from '../repositories/invoices/retrieve'

const allocation = {
  id: 'palloc_1',
  amount: 1250n,
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_001,
  payment: {
    id: 'pay_1',
    number: 'PAY-001',
    paymentDate: 1_700_000_000,
    currency: 'JMD',
    referenceNumber: null,
    status: 'SUCCEEDED',
    paymentMode: { id: 'pmode_1', name: 'Bank transfer' },
  },
}

const creditNoteAllocation = {
  id: 'cnalloc_1',
  amount: 500n,
  createdAt: 1_700_000_002,
  updatedAt: 1_700_000_003,
  creditNote: {
    id: 'cn_1',
    number: 'CN-001',
    issueAt: 1_700_000_000,
    currency: 'JMD',
  },
}

describe('invoice payment history', () => {
  it('excludes reversed allocations in the retrieve query', async () => {
    findFirst.mockResolvedValue(null)

    await retrieve('ten_1', 'inv_1')

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          allocations: expect.objectContaining({
            where: { reversedAt: null },
          }),
          creditNoteAllocations: expect.objectContaining({
            where: { reversedAt: null },
          }),
        }),
      })
    )
  })

  it('serializes payment allocation amounts as strings', () => {
    const invoice = serializeDocument('invoice', {
      allocations: [allocation],
      creditNoteAllocations: [],
    })

    expect(invoice.paymentAllocations).toMatchObject([{ amount: '1250' }])
  })

  it('serializes credit note allocation amounts as strings', () => {
    const invoice = serializeDocument('invoice', {
      allocations: [],
      creditNoteAllocations: [creditNoteAllocation],
    })

    expect(invoice.creditNoteAllocations).toMatchObject([{ amount: '500' }])
  })

  it('adds payment allocation and payment discriminators', () => {
    const invoice = serializeDocument('invoice', {
      allocations: [allocation],
      creditNoteAllocations: [],
    })

    expect(invoice.paymentAllocations).toMatchObject([
      { object: 'payment_allocation', payment: { object: 'payment' } },
    ])
  })

  it('adds credit note allocation and credit note discriminators', () => {
    const invoice = serializeDocument('invoice', {
      allocations: [],
      creditNoteAllocations: [creditNoteAllocation],
    })

    expect(invoice.creditNoteAllocations).toMatchObject([
      {
        object: 'credit_note_allocation',
        creditNote: { object: 'credit_note' },
      },
    ])
  })

  it('serializes no invoice allocations as empty arrays', () => {
    const invoice = serializeDocument('invoice', {
      allocations: [],
      creditNoteAllocations: [],
    })

    expect(invoice.paymentAllocations).toEqual([])
    expect(invoice.creditNoteAllocations).toEqual([])
  })

  it('leaves document types without allocation relations unaffected', () => {
    const quote = serializeDocument('quote', { lines: [] })

    expect(quote).not.toHaveProperty('paymentAllocations')
    expect(quote).not.toHaveProperty('creditNoteAllocations')
  })

  it('keeps credit note allocations under their established contract', () => {
    const allocations = [{ id: 'cnalloc_2', amount: 500n }]
    const creditNote = serializeDocument('credit_note', { allocations })

    expect(creditNote).toMatchObject({ allocations: [{ amount: '500' }] })
    expect(creditNote).not.toHaveProperty('paymentAllocations')
    expect(creditNote).not.toMatchObject({
      allocations: [expect.objectContaining({ object: 'payment_allocation' })],
    })
  })
})
