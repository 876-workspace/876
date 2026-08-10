import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  retrieveCustomerByUserId,
  listPackages,
  retrieveCustomerPortalPackage,
} = vi.hoisted(() => ({
  retrieveCustomerByUserId: vi.fn(),
  listPackages: vi.fn(),
  retrieveCustomerPortalPackage: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {},
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/modules/customers', () => ({
  retrieveCustomerByUserId,
}))

vi.mock('@/modules/packages', () => ({
  listPackages,
  retrieveCustomerPortalPackage,
}))

vi.mock('../portal.repository', () => ({
  findActivePortalTenantByHostname: vi.fn(),
  findActivePortalTenantBySlug: vi.fn(),
  findPortalShippingAddress: vi.fn(),
}))

const portal = await import('../portal.service')

beforeEach(() => {
  vi.clearAllMocks()
  retrieveCustomerByUserId.mockResolvedValue({ id: 'ccp_123' })
})

describe('portal service', () => {
  it('derives the package customer filter from the authenticated user profile', async () => {
    listPackages.mockResolvedValue({ data: [], hasMore: false })

    await expect(
      portal.listPortalPackages('ten_123', 'user_123', {
        status: 'READY_FOR_PICKUP',
        limit: 25,
      })
    ).resolves.toEqual({ data: [], hasMore: false })

    expect(retrieveCustomerByUserId).toHaveBeenCalledWith('ten_123', 'user_123')
    expect(listPackages).toHaveBeenCalledWith('ten_123', {
      customer_id: 'ccp_123',
      status: 'READY_FOR_PICKUP',
      limit: 25,
    })
  })

  it('retrieves a package through the customer-scoped service method', async () => {
    retrieveCustomerPortalPackage.mockResolvedValue({ id: 'pkg_123' })

    await expect(
      portal.retrievePortalPackage('ten_123', 'user_123', 'pkg_123')
    ).resolves.toEqual({ id: 'pkg_123' })

    expect(retrieveCustomerPortalPackage).toHaveBeenCalledWith(
      'ten_123',
      'ccp_123',
      'pkg_123'
    )
  })

  it('does not list packages when the signed-in user has no tenant profile', async () => {
    retrieveCustomerByUserId.mockRejectedValue(new Error('customer/not-found'))

    await expect(
      portal.listPortalPackages('ten_123', 'user_123', { limit: 25 })
    ).rejects.toThrow('customer/not-found')

    expect(listPackages).not.toHaveBeenCalled()
  })

  // Goldbergyoni 1.1 AAA, 1.2 BDD hierarchy, 1.6 Realistic data, 2.11 Fault injection
  describe('Advanced — AAA + isolation + realistic outcomes (2.7, 2.11, 1.6)', () => {
    it('When retrievePortalCustomer resolves, then returns the same customer object', async () => {
      // Arrange
      const expected = {
        id: 'ccp_kingston_1',
        tenantId: 'ten_1',
        billingCustomerId: 'cus_Tash_1',
      }
      retrieveCustomerByUserId.mockResolvedValueOnce(expected as never)
      // Act
      const result = await portal.retrievePortalCustomer(
        'ten_1',
        'user_kingston'
      )
      // Assert
      expect(result).toEqual(expected)
      expect(retrieveCustomerByUserId).toHaveBeenCalledWith(
        'ten_1',
        'user_kingston'
      )
    })

    it('When retrievePortalCustomer fails with not-found, then it propagates without fallback', async () => {
      // Arrange
      const err = new Error('customer/not-found')
      retrieveCustomerByUserId.mockRejectedValueOnce(err)
      // Act & Assert
      await expect(
        portal.retrievePortalCustomer('ten_1', 'user_missing')
      ).rejects.toBe(err)
      expect(retrieveCustomerByUserId).toHaveBeenCalledTimes(1)
    })

    it('When listPortalPackages is called twice with same user, then each call resolves profile independently (no shared mutable state)', async () => {
      // Arrange
      retrieveCustomerByUserId.mockResolvedValue({ id: 'ccp_a' } as never)
      listPackages.mockResolvedValue({ data: [], hasMore: false } as never)
      // Act
      await portal.listPortalPackages('ten_1', 'user_a', { limit: 10 })
      retrieveCustomerByUserId.mockResolvedValue({ id: 'ccp_b' } as never)
      await portal.listPortalPackages('ten_1', 'user_b', { limit: 10 })
      // Assert
      expect(listPackages).toHaveBeenNthCalledWith(
        1,
        'ten_1',
        expect.objectContaining({ customer_id: 'ccp_a' })
      )
      expect(listPackages).toHaveBeenNthCalledWith(
        2,
        'ten_1',
        expect.objectContaining({ customer_id: 'ccp_b' })
      )
    })

    it('When retrievePortalPackage is called for missing underlying package, then error propagates', async () => {
      // Arrange
      retrieveCustomerPortalPackage.mockRejectedValueOnce(
        new Error('package/not-found')
      )
      // Act & Assert
      await expect(
        portal.retrievePortalPackage('ten_1', 'user_123', 'pkg_missing')
      ).rejects.toThrow('package/not-found')
      expect(retrieveCustomerPortalPackage).toHaveBeenCalledWith(
        'ten_1',
        'ccp_123',
        'pkg_missing'
      )
    })

    it('When listPortalPackages receives realistic query with Jamaican status, then forwards query unchanged plus customer_id', async () => {
      // Arrange — realistic Jamaican wharf package status
      const realisticQuery = {
        status: 'READY_FOR_PICKUP' as const,
        limit: 25,
        starting_after: 'pkg_real_1',
      }
      listPackages.mockResolvedValueOnce({
        data: [{ id: 'pkg_real_2' }],
        hasMore: true,
      } as never)
      // Act
      const result = await portal.listPortalPackages(
        'ten_1',
        'user_123',
        realisticQuery
      )
      // Assert
      expect(listPackages).toHaveBeenCalledWith('ten_1', {
        ...realisticQuery,
        customer_id: 'ccp_123',
      })
      expect(result.hasMore).toBe(true)
    })

    it('When concurrent portal calls are made, then promises remain independent', async () => {
      // Arrange — isolation per Goldbergyoni 2.7
      listPackages.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 5))
        return { data: [], hasMore: false } as never
      })
      // Act
      const [a, b] = await Promise.all([
        portal.listPortalPackages('ten_1', 'user_1', { limit: 5 }),
        portal.listPortalPackages('ten_1', 'user_2', { limit: 5 }),
      ])
      // Assert
      expect(a).toEqual({ data: [], hasMore: false })
      expect(b).toEqual({ data: [], hasMore: false })
      expect(retrieveCustomerByUserId).toHaveBeenCalledTimes(2)
    })

    it('When retrievePortalPackage succeeds with realistic Kingston tracking, then returns package', async () => {
      // Arrange
      const pkg = {
        id: 'pkg_kng_1001',
        tracking_num: 'KNG1001',
        status: 'READY_FOR_PICKUP',
      }
      retrieveCustomerPortalPackage.mockResolvedValueOnce(pkg as never)
      // Act
      const result = await portal.retrievePortalPackage(
        'ten_1',
        'user_123',
        'pkg_kng_1001'
      )
      // Assert
      expect(result).toEqual(pkg)
      expect(retrieveCustomerByUserId).toHaveBeenCalledBefore(
        retrieveCustomerPortalPackage
      )
    })
  })
})
