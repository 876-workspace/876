import { beforeEach, describe, expect, it, vi } from 'vitest'

import { nextDocumentNumber } from './numbers'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

describe('nextDocumentNumber', () => {
  beforeEach(() => {
    prismaRef.current = {
      documentSequence: {
        upsert: vi.fn().mockResolvedValue({ nextNumber: 2 }),
      },
    }
    vi.clearAllMocks()
  })

  it.each([
    ['QUOTE', 2, 'Q-000001'],
    ['INVOICE', 43, 'INV-000042'],
  ] as const)(
    'allocates the next %s number',
    async (documentType, nextNumber, expected) => {
      const sequence = (
        prismaRef.current as unknown as {
          documentSequence: { upsert: ReturnType<typeof vi.fn> }
        }
      ).documentSequence
      sequence.upsert.mockResolvedValue({ nextNumber })

      const result = await nextDocumentNumber(
        'ten_123',
        documentType,
        1_783_771_200
      )

      expect(result).toBe(expected)
      expect(sequence.upsert).toHaveBeenCalledTimes(1)
      expect(sequence.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_documentType: { tenantId: 'ten_123', documentType },
        },
        create: {
          tenantId: 'ten_123',
          documentType,
          nextNumber: 2,
          createdAt: 1_783_771_200,
          updatedAt: 1_783_771_200,
        },
        update: {
          nextNumber: { increment: 1 },
          updatedAt: 1_783_771_200,
        },
        select: { nextNumber: true },
      })
    }
  )

  it('retains the full sequence when it exceeds six digits', async () => {
    const sequence = (
      prismaRef.current as unknown as {
        documentSequence: { upsert: ReturnType<typeof vi.fn> }
      }
    ).documentSequence
    sequence.upsert.mockResolvedValue({ nextNumber: 1_000_002 })

    const result = await nextDocumentNumber('ten_123', 'INVOICE', 1)

    expect(result).toBe('INV-1000001')
  })
})
