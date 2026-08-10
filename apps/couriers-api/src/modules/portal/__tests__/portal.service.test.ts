import { beforeEach, describe, expect, it, vi } from 'vitest'

const { retrieveCustomerByUserId, listPackages, retrieveCustomerPackage } =
  vi.hoisted(() => ({
    retrieveCustomerByUserId: vi.fn(),
    listPackages: vi.fn(),
    retrieveCustomerPackage: vi.fn(),
  }))

vi.mock('@/modules/customers/customers.service', () => ({
  retrieveCustomerByUserId,
}))

vi.mock('@/modules/packages/packages.service', () => ({
  listPackages,
  retrieveCustomerPackage,
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
    retrieveCustomerPackage.mockResolvedValue({ id: 'pkg_123' })

    await expect(
      portal.retrievePortalPackage('ten_123', 'user_123', 'pkg_123')
    ).resolves.toEqual({ id: 'pkg_123' })

    expect(retrieveCustomerPackage).toHaveBeenCalledWith(
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
})
