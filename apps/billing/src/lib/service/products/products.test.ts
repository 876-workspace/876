import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'
import { deleteProduct } from './delete'
import { ensure } from './ensure'
import { update } from './update'

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

function createParams(overrides: Record<string, unknown> = {}) {
  return {
    slug: '876-couriers',
    name: '876 Couriers',
    type: 'SERVICE',
    ...overrides,
  } as never
}

function ensureParams(overrides: Record<string, unknown> = {}) {
  return {
    sourceAppId: 'app_couriers',
    slug: '876-couriers',
    name: '876 Couriers',
    description: null,
    active: true,
    ...overrides,
  }
}

describe('product mutations', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      product: {
        create: vi.fn().mockResolvedValue({ id: 'prod_123' }),
        delete: vi.fn().mockResolvedValue({ id: 'prod_123' }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: 'prod_123' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      plan: { findFirst: vi.fn().mockResolvedValue(null) },
      addon: { findFirst: vi.fn().mockResolvedValue(null) },
      coupon: { findFirst: vi.fn().mockResolvedValue(null) },
    }
    mocks.generateId.mockReturnValue('prod_123')
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a product with normalized optional fields', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { create: ReturnType<typeof vi.fn> }
      }
    ).product

    const result = await create('ten_123', createParams())

    expect(result).toEqual({ data: { id: 'prod_123' }, error: null })
    expect(mocks.generateId).toHaveBeenCalledWith('Product')
    expect(product.create).toHaveBeenCalledWith({
      data: {
        id: 'prod_123',
        tenantId: 'ten_123',
        sourceAppId: null,
        slug: '876-couriers',
        name: '876 Couriers',
        description: null,
        type: 'SERVICE',
        notificationRecipients: null,
        redirectUrl: null,
        isActive: true,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
  })

  it('persists explicit product integration fields', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { create: ReturnType<typeof vi.fn> }
      }
    ).product
    const params = createParams({
      sourceAppId: 'app_couriers',
      description: 'Courier management.',
      notificationRecipients: 'ops@example.com',
      redirectUrl: 'https://couriers.example.com',
    })

    const result = await create('ten_123', params)

    expect(result.error).toBeNull()
    expect(product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceAppId: 'app_couriers',
        description: 'Courier management.',
        notificationRecipients: 'ops@example.com',
        redirectUrl: 'https://couriers.example.com',
      }),
    })
  })

  it('maps duplicate product identifiers to conflict', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { create: ReturnType<typeof vi.fn> }
      }
    ).product
    product.create.mockRejectedValue({ code: 'P2002' })

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'A product with this identifier already exists.',
      status: 409,
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('returns a safe 500 for unexpected create failure', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { create: ReturnType<typeof vi.fn> }
      }
    ).product
    product.create.mockRejectedValue(new Error('database unavailable'))

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Failed to create the product.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty product update', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).product

    const result = await update('ten_123', 'prod_123', {})

    expect(result).toEqual({
      data: null,
      error: 'Nothing to update.',
      status: 422,
    })
    expect(product.updateMany).not.toHaveBeenCalled()
  })

  it('updates every supplied product field including false and null', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).product
    const params = {
      name: 'Courier Platform',
      description: null,
      type: 'GOOD' as const,
      notificationRecipients: null,
      redirectUrl: null,
      isActive: false,
    }

    const result = await update('ten_123', 'prod_123', params)

    expect(result).toEqual({ data: { id: 'prod_123' }, error: null })
    expect(product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod_123', tenantId: 'ten_123' },
      data: { updatedAt: 1_783_771_200, ...params },
    })
  })

  it('returns 404 when no product matches an update', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).product
    product.updateMany.mockResolvedValue({ count: 0 })

    const result = await update('ten_123', 'prod_missing', { name: 'Missing' })

    expect(result).toEqual({
      data: null,
      error: 'Product not found.',
      status: 404,
    })
  })

  it('returns a safe 500 for unexpected update failure', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).product
    product.updateMany.mockRejectedValue(new Error('database unavailable'))

    const result = await update('ten_123', 'prod_123', { name: 'Updated' })

    expect(result).toEqual({
      data: null,
      error: 'Failed to update the product.',
      status: 500,
    })
  })

  it('returns 404 when deleting a missing product', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { delete: ReturnType<typeof vi.fn> }
      }
    ).product

    const result = await deleteProduct('ten_123', 'prod_missing')

    expect(result).toEqual({
      data: null,
      error: 'Product not found.',
      status: 404,
    })
    expect(product.delete).not.toHaveBeenCalled()
  })

  it('protects a product with plans', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).product
    product.findFirst.mockResolvedValue({ _count: { plans: 1 } })

    const result = await deleteProduct('ten_123', 'prod_123')

    expect(result).toEqual({
      data: null,
      error: 'This product has plans, add-ons, or coupons. Archive it instead.',
      status: 409,
    })
    expect(product.delete).not.toHaveBeenCalled()
  })

  it('deletes a product without plans', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).product
    product.findFirst.mockResolvedValue({ _count: { plans: 0 } })

    const result = await deleteProduct('ten_123', 'prod_123')

    expect(result).toEqual({ data: { id: 'prod_123' }, error: null })
    expect(product.delete).toHaveBeenCalledWith({ where: { id: 'prod_123' } })
  })

  it('returns a safe 500 when deletion throws', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).product
    product.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await deleteProduct('ten_123', 'prod_123')

    expect(result).toEqual({
      data: null,
      error: 'Failed to delete the product.',
      status: 500,
    })
  })

  it('reconciles an existing product by source app ID', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).product
    product.findFirst.mockResolvedValue({ id: 'prod_existing' })

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({ data: { id: 'prod_existing' }, error: null })
    expect(product.update).toHaveBeenCalledWith({
      where: { id: 'prod_existing' },
      data: {
        sourceAppId: 'app_couriers',
        slug: '876-couriers',
        name: '876 Couriers',
        description: null,
        isActive: true,
        updatedAt: 1_783_771_200,
      },
    })
    expect(product.create).not.toHaveBeenCalled()
  })

  it('creates and reconciles a missing product', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: {
          create: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).product

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({ data: { id: 'prod_123' }, error: null })
    expect(product.create).toHaveBeenCalledTimes(1)
    expect(product.update).toHaveBeenCalledTimes(1)
  })

  it.each([
    [null, 'prod_slug_unlinked'],
    ['app_couriers', 'prod_slug_linked'],
  ])(
    'reconciles conflict candidate with source app %s',
    async (sourceAppId, id) => {
      const product = (
        mocks.prismaRef.current as unknown as {
          product: {
            findFirst: ReturnType<typeof vi.fn>
            create: ReturnType<typeof vi.fn>
            update: ReturnType<typeof vi.fn>
          }
        }
      ).product
      product.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id, sourceAppId })
      product.create.mockRejectedValue({ code: 'P2002' })

      const result = await ensure('ten_123', ensureParams())

      expect(result).toEqual({ data: { id }, error: null })
      expect(product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id } })
      )
    }
  )

  it('returns the original conflict when no slug candidate exists', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: {
          findFirst: ReturnType<typeof vi.fn>
          create: ReturnType<typeof vi.fn>
        }
      }
    ).product
    product.findFirst.mockResolvedValue(null)
    product.create.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({
      data: null,
      error: 'A product with this identifier already exists.',
      status: 409,
    })
  })

  it('rejects a slug linked to a different source app', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: {
          findFirst: ReturnType<typeof vi.fn>
          create: ReturnType<typeof vi.fn>
        }
      }
    ).product
    product.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'prod_other',
      sourceAppId: 'app_other',
    })
    product.create.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({
      data: null,
      error: 'This product identifier is linked to a different app.',
      status: 409,
    })
  })

  it('maps a reconcile uniqueness conflict to linked-app conflict', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).product
    product.findFirst.mockResolvedValue({ id: 'prod_existing' })
    product.update.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({
      data: null,
      error: 'This product identifier is linked to a different app.',
      status: 409,
    })
  })

  it('returns a safe 500 for unexpected reconcile failure', async () => {
    const product = (
      mocks.prismaRef.current as unknown as {
        product: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).product
    product.findFirst.mockResolvedValue({ id: 'prod_existing' })
    product.update.mockRejectedValue(new Error('database unavailable'))

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({
      data: null,
      error: 'Failed to reconcile the product.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
