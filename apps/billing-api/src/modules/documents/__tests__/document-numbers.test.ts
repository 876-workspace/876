import { describe, expect, it, vi } from 'vitest'

import { nextDocumentNumber } from '../document-numbers.repository'

describe('nextDocumentNumber', () => {
  it('formats the first number as PREFIX-000001', async () => {
    const fake = {
      documentSequence: {
        upsert: vi.fn().mockResolvedValue({ nextNumber: 2 }),
      },
    } as unknown as never
    const result = await nextDocumentNumber('ten_1', 'INVOICE', 1000, fake)
    expect(result).toBe('INV-000001')
    expect(fake.documentSequence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_documentType: { tenantId: 'ten_1', documentType: 'INVOICE' },
        },
        create: expect.objectContaining({
          tenantId: 'ten_1',
          documentType: 'INVOICE',
          nextNumber: 2,
        }),
      })
    )
  })

  it('increments and pads to 6 digits', async () => {
    const fake = {
      documentSequence: {
        upsert: vi.fn().mockResolvedValue({ nextNumber: 43 }),
      },
    } as unknown as never
    const result = await nextDocumentNumber('ten_1', 'PAYMENT', 1000, fake)
    expect(result).toBe('PAY-000042')
  })

  it('maps document types to correct prefixes', async () => {
    const cases: Array<[string, string]> = [
      ['QUOTE', 'Q-000001'],
      ['ESTIMATE', 'EST-000001'],
      ['CREDIT_NOTE', 'CN-000001'],
      ['REFUND', 'REF-000001'],
    ]
    for (const [type, expected] of cases) {
      const fake = {
        documentSequence: {
          upsert: vi.fn().mockResolvedValue({ nextNumber: 2 }),
        },
      }
      const result = await nextDocumentNumber(
        'ten_1',
        type as unknown as never,
        1000,
        fake
      )
      expect(result).toBe(expected)
    }
  })

  it('handles large numbers without truncation', async () => {
    const fake = {
      documentSequence: {
        upsert: vi.fn().mockResolvedValue({ nextNumber: 1000001 }),
      },
    }
    const result = await nextDocumentNumber('ten_1', 'INVOICE', 1000, fake)
    expect(result).toBe('INV-1000000')
  })
})
