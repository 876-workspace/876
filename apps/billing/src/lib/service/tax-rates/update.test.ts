import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TaxRateUpdateParams } from '@/types/tax'

import { update } from './update'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  nowUnixSeconds: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))
vi.mock('@876/core/timestamps', () => ({
  nowUnixSeconds: mocks.nowUnixSeconds,
}))

const NOW = 1_783_771_200

type Tx = {
  taxRate: {
    updateMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

let tx: Tx

function prisma() {
  return mocks.prismaRef.current as unknown as {
    taxRate: { findFirst: ReturnType<typeof vi.fn> }
    $transaction: ReturnType<typeof vi.fn>
  }
}

function params(value: Partial<TaxRateUpdateParams>): TaxRateUpdateParams {
  return value as TaxRateUpdateParams
}

describe('tax-rate update', () => {
  beforeEach(() => {
    tx = {
      taxRate: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn().mockResolvedValue({ id: 'taxr_1' }),
      },
    }

    mocks.prismaRef.current = {
      taxRate: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'taxr_1',
          isDefault: false,
          isActive: true,
        }),
      },
      $transaction: vi.fn(async (fn: (t: Tx) => Promise<unknown>) => fn(tx)),
    } as unknown as Record<string, unknown>

    mocks.nowUnixSeconds.mockReturnValue(NOW)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('guard clauses', () => {
    it('returns 404 for an unknown rate and never opens a transaction', async () => {
      prisma().taxRate.findFirst.mockResolvedValue(null)

      const result = await update(
        'ten_1',
        'taxr_missing',
        params({ isActive: false })
      )

      expect(result).toEqual({
        data: null,
        error: 'Tax rate not found.',
        status: 404,
      })
      expect(prisma().taxRate.findFirst).toHaveBeenCalledWith({
        where: { id: 'taxr_missing', tenantId: 'ten_1' },
      })
      expect(prisma().$transaction).not.toHaveBeenCalled()
    })

    it('rejects archiving the default rate with a 409', async () => {
      prisma().taxRate.findFirst.mockResolvedValue({
        id: 'taxr_1',
        isDefault: true,
        isActive: true,
      })

      const result = await update(
        'ten_1',
        'taxr_1',
        params({ isActive: false })
      )

      expect(result).toEqual({
        data: null,
        error: 'Choose another default rate before archiving this one.',
        status: 409,
      })
      expect(prisma().$transaction).not.toHaveBeenCalled()
    })

    it('rejects clearing the default flag on the default rate with a 409', async () => {
      prisma().taxRate.findFirst.mockResolvedValue({
        id: 'taxr_1',
        isDefault: true,
        isActive: true,
      })

      const result = await update(
        'ten_1',
        'taxr_1',
        params({ isDefault: false })
      )

      expect(result).toEqual({
        data: null,
        error: 'Choose another rate as the default instead.',
        status: 409,
      })
      expect(prisma().$transaction).not.toHaveBeenCalled()
    })

    it('rejects making an archived rate the default with a 422', async () => {
      const result = await update(
        'ten_1',
        'taxr_1',
        params({ isDefault: true, isActive: false })
      )

      expect(result).toEqual({
        data: null,
        error: 'An archived rate cannot be the default.',
        status: 422,
      })
      expect(prisma().$transaction).not.toHaveBeenCalled()
    })
  })

  describe('make default', () => {
    it('clears other defaults and forces the rate active', async () => {
      const result = await update(
        'ten_1',
        'taxr_1',
        params({ isDefault: true })
      )

      expect(result).toEqual({ data: { id: 'taxr_1' }, error: null })
      expect(tx.taxRate.updateMany).toHaveBeenCalledTimes(1)
      expect(tx.taxRate.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'ten_1', isDefault: true },
        data: { isDefault: false, updatedAt: NOW },
      })
      expect(tx.taxRate.update).toHaveBeenCalledTimes(1)
      expect(tx.taxRate.update).toHaveBeenCalledWith({
        where: { id: 'taxr_1' },
        data: { isDefault: true, isActive: true, updatedAt: NOW },
      })
    })
  })

  describe('archive and restore', () => {
    it('archives a non-default rate by setting only isActive false', async () => {
      const result = await update(
        'ten_1',
        'taxr_1',
        params({ isActive: false })
      )

      expect(result).toEqual({ data: { id: 'taxr_1' }, error: null })
      expect(tx.taxRate.updateMany).not.toHaveBeenCalled()
      expect(tx.taxRate.update).toHaveBeenCalledWith({
        where: { id: 'taxr_1' },
        data: { isActive: false, updatedAt: NOW },
      })
    })

    it('restores an archived rate by setting isActive true', async () => {
      prisma().taxRate.findFirst.mockResolvedValue({
        id: 'taxr_1',
        isDefault: false,
        isActive: false,
      })

      const result = await update('ten_1', 'taxr_1', params({ isActive: true }))

      expect(result).toEqual({ data: { id: 'taxr_1' }, error: null })
      expect(tx.taxRate.updateMany).not.toHaveBeenCalled()
      expect(tx.taxRate.update).toHaveBeenCalledWith({
        where: { id: 'taxr_1' },
        data: { isActive: true, updatedAt: NOW },
      })
    })
  })

  describe('error handling', () => {
    it('returns a 500 when the transaction throws', async () => {
      prisma().$transaction.mockRejectedValue(new Error('db down'))

      const result = await update(
        'ten_1',
        'taxr_1',
        params({ isActive: false })
      )

      expect(result).toEqual({
        data: null,
        error: 'Failed to update the tax rate.',
        status: 500,
      })
    })
  })
})
