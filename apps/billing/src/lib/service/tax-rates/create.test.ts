import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TaxRateCreateParams } from '@/types/tax'

import { create } from './create'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
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

const NOW = 1_783_771_200

type Tx = {
  taxRate: {
    count: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

let tx: Tx

function prisma() {
  return mocks.prismaRef.current as unknown as {
    taxAuthority: { findFirst: ReturnType<typeof vi.fn> }
    $transaction: ReturnType<typeof vi.fn>
  }
}

function createParams(
  overrides: Partial<TaxRateCreateParams> = {}
): TaxRateCreateParams {
  return {
    name: 'Reduced GCT',
    rate: '10',
    inclusive: false,
    ...overrides,
  } as TaxRateCreateParams
}

describe('tax-rate create', () => {
  beforeEach(() => {
    tx = {
      taxRate: {
        count: vi.fn().mockResolvedValue(1),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'taxr_new' }),
      },
    }

    mocks.prismaRef.current = {
      taxAuthority: {
        findFirst: vi.fn().mockResolvedValue({ id: 'taxa_default' }),
      },
      $transaction: vi.fn(async (fn: (t: Tx) => Promise<unknown>) => fn(tx)),
    } as unknown as Record<string, unknown>

    mocks.generateId.mockReturnValue('taxr_new')
    mocks.nowUnixSeconds.mockReturnValue(NOW)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authority resolution', () => {
    it('rejects when the named authority is missing or inactive and does not create a rate', async () => {
      prisma().taxAuthority.findFirst.mockResolvedValue(null)

      const result = await create(
        'ten_1',
        createParams({ taxAuthorityId: 'taxa_missing' })
      )

      expect(result).toEqual({
        data: null,
        error: 'Select an active tax authority from this workspace.',
        status: 422,
      })
      expect(prisma().taxAuthority.findFirst).toHaveBeenCalledTimes(1)
      expect(prisma().taxAuthority.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'ten_1', isActive: true, id: 'taxa_missing' },
        select: { id: true },
      })
      expect(prisma().$transaction).not.toHaveBeenCalled()
      expect(tx.taxRate.create).not.toHaveBeenCalled()
    })

    it('rejects with the default-authority message when no authority id is given', async () => {
      prisma().taxAuthority.findFirst.mockResolvedValue(null)

      const result = await create('ten_1', createParams())

      expect(result).toEqual({
        data: null,
        error: 'Create or select a default tax authority first.',
        status: 422,
      })
      expect(prisma().taxAuthority.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'ten_1', isActive: true, isDefault: true },
        select: { id: true },
      })
      expect(prisma().$transaction).not.toHaveBeenCalled()
      expect(tx.taxRate.create).not.toHaveBeenCalled()
    })
  })

  describe('default election', () => {
    it('makes the first active rate the default even without the isDefault param', async () => {
      tx.taxRate.count.mockResolvedValue(0)

      const result = await create('ten_1', createParams())

      expect(result).toEqual({ data: { id: 'taxr_new' }, error: null })
      expect(tx.taxRate.count).toHaveBeenCalledTimes(1)
      expect(tx.taxRate.count).toHaveBeenCalledWith({
        where: { tenantId: 'ten_1', isActive: true },
      })
      expect(tx.taxRate.updateMany).toHaveBeenCalledTimes(1)
      expect(tx.taxRate.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'ten_1', isDefault: true },
        data: { isDefault: false, updatedAt: NOW },
      })
      expect(tx.taxRate.create).toHaveBeenCalledTimes(1)
      expect(tx.taxRate.create.mock.calls[0][0].data.isDefault).toBe(true)
    })

    it('clears the previous default when isDefault:true is passed even though other rates exist', async () => {
      tx.taxRate.count.mockResolvedValue(3)

      const result = await create('ten_1', createParams({ isDefault: true }))

      expect(result).toEqual({ data: { id: 'taxr_new' }, error: null })
      expect(tx.taxRate.updateMany).toHaveBeenCalledTimes(1)
      expect(tx.taxRate.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'ten_1', isDefault: true },
        data: { isDefault: false, updatedAt: NOW },
      })
      expect(tx.taxRate.create.mock.calls[0][0].data.isDefault).toBe(true)
    })

    it('creates a non-default rate and skips updateMany when other rates exist and no param is set', async () => {
      tx.taxRate.count.mockResolvedValue(2)

      const result = await create('ten_1', createParams())

      expect(result).toEqual({ data: { id: 'taxr_new' }, error: null })
      expect(tx.taxRate.updateMany).not.toHaveBeenCalled()
      expect(tx.taxRate.create.mock.calls[0][0].data.isDefault).toBe(false)
    })
  })

  describe('created row shape', () => {
    it('writes the full row with an id, rate passthrough, and null defaults', async () => {
      tx.taxRate.count.mockResolvedValue(2)

      await create('ten_1', createParams({ rate: '12.5', inclusive: true }))

      expect(mocks.generateId).toHaveBeenCalledWith('TaxRate')
      expect(tx.taxRate.create).toHaveBeenCalledWith({
        data: {
          id: 'taxr_new',
          tenantId: 'ten_1',
          taxAuthorityId: 'taxa_default',
          name: 'Reduced GCT',
          description: null,
          taxType: null,
          rate: '12.5',
          inclusive: true,
          startsAt: null,
          isDefault: false,
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW,
        },
      })
    })
  })

  describe('error handling', () => {
    it('returns a 500 when the transaction throws', async () => {
      prisma().$transaction.mockRejectedValue(new Error('db down'))

      const result = await create('ten_1', createParams())

      expect(result).toEqual({
        data: null,
        error: 'Failed to create the tax rate.',
        status: 500,
      })
    })
  })
})
