import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { link } from './link'
import { unlink } from './unlink'

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

type PrismaMock = {
  customer: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock

describe('service.customers.link', () => {
  beforeEach(() => {
    prismaMock = {
      customer: {
        findFirst: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'cus_123' }),
      },
    }
    mocks.prismaRef.current = prismaMock
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('link', () => {
    it('links an EXTERNAL customer to an 876 account', async () => {
      prismaMock.customer.findFirst
        .mockResolvedValueOnce({ id: 'cus_123', customerType: 'EXTERNAL' })
        .mockResolvedValueOnce(null)

      const result = await link('ten_123', 'cus_123', { userId: 'usr_456' })

      expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
      expect(prismaMock.customer.findFirst).toHaveBeenNthCalledWith(1, {
        where: { id: 'cus_123', tenantId: 'ten_123' },
        select: { id: true, customerType: true },
      })
      expect(prismaMock.customer.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          tenantId: 'ten_123',
          userId: 'usr_456',
          id: { not: 'cus_123' },
        },
        select: { id: true },
      })
      expect(prismaMock.customer.update).toHaveBeenCalledTimes(1)
      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 'cus_123' },
        data: {
          customerType: 'CORE_USER',
          userId: 'usr_456',
          coreSyncedAt: null,
          updatedAt: 1_783_771_200,
        },
      })
    })

    it('trims a userId with surrounding whitespace before persisting', async () => {
      prismaMock.customer.findFirst
        .mockResolvedValueOnce({ id: 'cus_123', customerType: 'EXTERNAL' })
        .mockResolvedValueOnce(null)

      const result = await link('ten_123', 'cus_123', {
        userId: '  usr_456  ',
      })

      expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 'cus_123' },
        data: {
          customerType: 'CORE_USER',
          userId: 'usr_456',
          coreSyncedAt: null,
          updatedAt: 1_783_771_200,
        },
      })
    })

    it('rejects an empty userId without querying the database', async () => {
      const result = await link('ten_123', 'cus_123', { userId: '' })

      expect(result).toEqual({
        data: null,
        error: 'Enter an 876 account ID.',
        status: 422,
      })
      expect(prismaMock.customer.findFirst).not.toHaveBeenCalled()
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('rejects a whitespace-only userId without querying the database', async () => {
      const result = await link('ten_123', 'cus_123', { userId: '   ' })

      expect(result).toEqual({
        data: null,
        error: 'Enter an 876 account ID.',
        status: 422,
      })
      expect(prismaMock.customer.findFirst).not.toHaveBeenCalled()
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('returns 404 when the customer does not exist in the tenant', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce(null)

      const result = await link('ten_123', 'cus_missing', {
        userId: 'usr_456',
      })

      expect(result).toEqual({
        data: null,
        error: 'Customer not found.',
        status: 404,
      })
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('rejects linking a customer already linked to an account', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce({
        id: 'cus_123',
        customerType: 'CORE_USER',
      })

      const result = await link('ten_123', 'cus_123', { userId: 'usr_456' })

      expect(result).toEqual({
        data: null,
        error: 'This customer is already linked to an 876 account.',
        status: 422,
      })
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('rejects linking an organization-typed customer', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce({
        id: 'cus_123',
        customerType: 'CORE_ORGANIZATION',
      })

      const result = await link('ten_123', 'cus_123', { userId: 'usr_456' })

      expect(result).toEqual({
        data: null,
        error: 'Organization customers cannot be linked to an 876 account.',
        status: 422,
      })
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('returns 409 when another customer already references the userId', async () => {
      prismaMock.customer.findFirst
        .mockResolvedValueOnce({ id: 'cus_123', customerType: 'EXTERNAL' })
        .mockResolvedValueOnce({ id: 'cus_other' })

      const result = await link('ten_123', 'cus_123', { userId: 'usr_456' })

      expect(result).toEqual({
        data: null,
        error: 'This 876 account is already linked to another customer.',
        status: 409,
      })
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('maps a P2002 race on write to the same 409 conflict', async () => {
      prismaMock.customer.findFirst
        .mockResolvedValueOnce({ id: 'cus_123', customerType: 'EXTERNAL' })
        .mockResolvedValueOnce(null)
      prismaMock.customer.update.mockRejectedValue({ code: 'P2002' })

      const result = await link('ten_123', 'cus_123', { userId: 'usr_456' })

      expect(result).toEqual({
        data: null,
        error: 'This 876 account is already linked to another customer.',
        status: 409,
      })
      expect(console.error).not.toHaveBeenCalled()
    })

    it('returns a safe 500 for an unexpected link failure', async () => {
      prismaMock.customer.findFirst
        .mockResolvedValueOnce({ id: 'cus_123', customerType: 'EXTERNAL' })
        .mockResolvedValueOnce(null)
      const error = new Error('database unavailable')
      prismaMock.customer.update.mockRejectedValue(error)

      const result = await link('ten_123', 'cus_123', { userId: 'usr_456' })

      expect(result).toEqual({
        data: null,
        error: 'Failed to link the customer.',
        status: 500,
      })
      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith(
        '[billing.service.customers.link]',
        error
      )
    })
  })

  describe('unlink', () => {
    it('unlinks a CORE_USER customer back to EXTERNAL', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce({
        id: 'cus_123',
        customerType: 'CORE_USER',
      })

      const result = await unlink('ten_123', 'cus_123')

      expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'cus_123', tenantId: 'ten_123' },
        select: { id: true, customerType: true },
      })
      expect(prismaMock.customer.update).toHaveBeenCalledTimes(1)
      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 'cus_123' },
        data: {
          customerType: 'EXTERNAL',
          userId: null,
          coreSyncedAt: null,
          updatedAt: 1_783_771_200,
        },
      })
    })

    it('returns 404 when the customer does not exist in the tenant', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce(null)

      const result = await unlink('ten_123', 'cus_missing')

      expect(result).toEqual({
        data: null,
        error: 'Customer not found.',
        status: 404,
      })
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('rejects unlinking a customer that is not core-linked', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce({
        id: 'cus_123',
        customerType: 'EXTERNAL',
      })

      const result = await unlink('ten_123', 'cus_123')

      expect(result).toEqual({
        data: null,
        error: 'This customer is not linked to an 876 account.',
        status: 422,
      })
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('rejects unlinking an organization-typed customer', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce({
        id: 'cus_123',
        customerType: 'CORE_ORGANIZATION',
      })

      const result = await unlink('ten_123', 'cus_123')

      expect(result).toEqual({
        data: null,
        error: 'Organization customers cannot be unlinked here.',
        status: 422,
      })
      expect(prismaMock.customer.update).not.toHaveBeenCalled()
    })

    it('returns a safe 500 for an unexpected unlink failure', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce({
        id: 'cus_123',
        customerType: 'CORE_USER',
      })
      const error = new Error('database unavailable')
      prismaMock.customer.update.mockRejectedValue(error)

      const result = await unlink('ten_123', 'cus_123')

      expect(result).toEqual({
        data: null,
        error: 'Failed to unlink the customer.',
        status: 500,
      })
      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith(
        '[billing.service.customers.unlink]',
        error
      )
    })
  })
})
