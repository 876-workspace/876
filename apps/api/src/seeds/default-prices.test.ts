import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  createFreePrice: vi.fn(),
  createProduct: vi.fn(),
  findActivePriceForApp: vi.fn(),
  findAppBySlug: vi.fn(),
  findProductBySlug: vi.fn(),
}))

vi.mock('./default-prices.repository', () => repository)
vi.mock('@/platform/ids', () => ({
  generateId: vi.fn((entityType: string) => `${entityType}_generated`),
}))
vi.mock('@/platform/logger', () => ({
  getLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() })),
}))

import { seedDefaultAppPrices } from './default-prices'

const NOW = 1_700_000_000

const apps = {
  consumer: { id: 'app_consumer', slug: '876-consumer', name: '876' },
  enterprise: {
    id: 'app_enterprise',
    slug: '876-enterprise',
    name: '876 Enterprise',
  },
  couriers: {
    id: 'app_couriers',
    slug: '876-couriers',
    name: '876 Couriers',
  },
  billing: {
    id: 'app_billing',
    slug: '876-billing',
    name: '876 Billing',
  },
}

describe('seedDefaultAppPrices', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW * 1000)
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('seeds a free price for an app with no active price', async () => {
    // ARRANGE
    repository.findAppBySlug.mockImplementation((slug: string) =>
      Promise.resolve(slug === apps.consumer.slug ? apps.consumer : null)
    )
    repository.findActivePriceForApp.mockResolvedValue(null)
    repository.findProductBySlug.mockResolvedValue(null)
    repository.createProduct.mockResolvedValue({ id: 'product_consumer_free' })
    repository.createFreePrice.mockResolvedValue({ id: 'price_consumer_free' })

    // ACT
    const result = await seedDefaultAppPrices()

    // ASSERT
    expect(result).toEqual({
      appsConsidered: 7,
      pricesCreated: 1,
      skippedExistingPrice: 0,
      skippedMissingApp: 6,
    })
    expect(repository.createProduct).toHaveBeenCalledTimes(1)
    expect(repository.createProduct).toHaveBeenCalledWith({
      id: 'product_generated',
      slug: '876-consumer-free',
      name: '876 Free',
      appId: 'app_consumer',
      now: BigInt(NOW),
    })
    expect(repository.createFreePrice).toHaveBeenCalledTimes(1)
    expect(repository.createFreePrice).toHaveBeenCalledWith({
      id: 'price_generated',
      productId: 'product_consumer_free',
      name: '876 Free',
      now: BigInt(NOW),
    })
  })

  it('skips an app that already has an active price', async () => {
    // ARRANGE
    repository.findAppBySlug.mockImplementation((slug: string) =>
      Promise.resolve(slug === apps.consumer.slug ? apps.consumer : null)
    )
    repository.findActivePriceForApp.mockResolvedValue({ id: 'price_existing' })

    // ACT
    const result = await seedDefaultAppPrices()

    // ASSERT
    expect(result).toEqual({
      appsConsidered: 7,
      pricesCreated: 0,
      skippedExistingPrice: 1,
      skippedMissingApp: 6,
    })
    expect(repository.findActivePriceForApp).toHaveBeenCalledTimes(1)
    expect(repository.findActivePriceForApp).toHaveBeenCalledWith(
      'app_consumer'
    )
    expect(repository.findProductBySlug).not.toHaveBeenCalled()
    expect(repository.createProduct).not.toHaveBeenCalled()
    expect(repository.createFreePrice).not.toHaveBeenCalled()
  })

  it('reuses an existing product after a partial prior run', async () => {
    // ARRANGE
    repository.findAppBySlug.mockImplementation((slug: string) =>
      Promise.resolve(slug === apps.couriers.slug ? apps.couriers : null)
    )
    repository.findActivePriceForApp.mockResolvedValue(null)
    repository.findProductBySlug.mockResolvedValue({
      id: 'product_couriers_free',
    })
    repository.createFreePrice.mockResolvedValue({ id: 'price_couriers_free' })

    // ACT
    const result = await seedDefaultAppPrices()

    // ASSERT
    expect(result).toEqual({
      appsConsidered: 7,
      pricesCreated: 1,
      skippedExistingPrice: 0,
      skippedMissingApp: 6,
    })
    expect(repository.findProductBySlug).toHaveBeenCalledTimes(1)
    expect(repository.findProductBySlug).toHaveBeenCalledWith(
      '876-couriers-free'
    )
    expect(repository.createProduct).not.toHaveBeenCalled()
    expect(repository.createFreePrice).toHaveBeenCalledTimes(1)
    expect(repository.createFreePrice).toHaveBeenCalledWith({
      id: 'price_generated',
      productId: 'product_couriers_free',
      name: '876 Couriers Free',
      now: BigInt(NOW),
    })
  })

  it('skips a missing app and continues with the remaining apps', async () => {
    // ARRANGE
    repository.findAppBySlug.mockImplementation((slug: string) =>
      Promise.resolve(slug === apps.enterprise.slug ? apps.enterprise : null)
    )
    repository.findActivePriceForApp.mockResolvedValue(null)
    repository.findProductBySlug.mockResolvedValue(null)
    repository.createProduct.mockResolvedValue({
      id: 'product_enterprise_free',
    })
    repository.createFreePrice.mockResolvedValue({
      id: 'price_enterprise_free',
    })

    // ACT
    const result = await seedDefaultAppPrices()

    // ASSERT
    expect(result).toEqual({
      appsConsidered: 7,
      pricesCreated: 1,
      skippedExistingPrice: 0,
      skippedMissingApp: 6,
    })
    expect(repository.findAppBySlug).toHaveBeenCalledTimes(7)
    expect(repository.findAppBySlug).toHaveBeenNthCalledWith(1, '876-consumer')
    expect(repository.findAppBySlug).toHaveBeenNthCalledWith(
      2,
      '876-enterprise'
    )
    expect(repository.findAppBySlug).toHaveBeenNthCalledWith(3, '876-couriers')
    expect(repository.findAppBySlug).toHaveBeenNthCalledWith(4, '876-billing')
    expect(repository.findAppBySlug).toHaveBeenNthCalledWith(5, '876-invoice')
    expect(repository.findAppBySlug).toHaveBeenNthCalledWith(6, '876-crm')
    expect(repository.findAppBySlug).toHaveBeenNthCalledWith(7, '876-projects')
    expect(repository.createProduct).toHaveBeenCalledWith({
      id: 'product_generated',
      slug: '876-enterprise-free',
      name: '876 Enterprise Free',
      appId: 'app_enterprise',
      now: BigInt(NOW),
    })
    expect(repository.createFreePrice).toHaveBeenCalledWith({
      id: 'price_generated',
      productId: 'product_enterprise_free',
      name: '876 Enterprise Free',
      now: BigInt(NOW),
    })
  })
})
