import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CourierCustomerProfile, Tenant } from '@/lib/db'
import type { Signed876Session } from '@/types/auth'
import type { PortalPackage } from '@/types/package'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPortalTenant: vi.fn(),
  retrieveByTenantAndUser: vi.fn(),
  listPackages: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/portal/tenant', () => ({
  getPortalTenant: mocks.getPortalTenant,
}))
vi.mock('@/lib/service', () => ({
  service: {
    customerProfiles: {
      retrieveByTenantAndUser: mocks.retrieveByTenantAndUser,
    },
    packages: { list: mocks.listPackages },
  },
}))

import { GET } from './route'

function createSession(
  overrides: Partial<Signed876Session> = {}
): Signed876Session {
  return {
    user: {
      id: 'user_kimani',
      email: 'kimani@rocketship.test',
      firstName: 'Kimani',
      lastName: 'Brown',
      realm: 'consumer',
    },
    accessToken: 'access_kimani',
    ...overrides,
  }
}

function createTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'ten_rocketship',
    orgId: 'org_rocketship',
    slug: 'rocketship',
    name: 'Rocketship Couriers Jamaica',
    mailboxPrefix: 'RSJ',
    status: 'ACTIVE',
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createProfile(
  overrides: Partial<CourierCustomerProfile> = {}
): CourierCustomerProfile {
  return {
    id: 'cprof_kimani',
    tenantId: 'ten_rocketship',
    userId: 'user_kimani',
    billingCustomerId: 'blcus_kimani',
    branchId: 'br_kingston',
    status: 'ACTIVE',
    trn: null,
    isCommercial: false,
    firstSeenAt: 1_784_419_200,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createPortalPackage(
  overrides: Partial<PortalPackage> = {}
): PortalPackage {
  return {
    id: 'pkg_rocketship_1001',
    tenantId: 'ten_rocketship',
    customerId: 'cprof_kimani',
    branchId: 'br_kingston',
    mailboxId: 'mbx_rsj1001',
    carrierId: 'car_fedex',
    sellerId: null,
    categoryId: null,
    billingInvoiceId: null,
    manifestId: null,
    trackingNum: 'FX876JM1001',
    status: 'READY_FOR_PICKUP',
    packageType: 'CARTON',
    description: 'Running shoes',
    quantity: 1,
    actualWeight: 4.5,
    chargeableWeight: 5,
    length: 14,
    width: 10,
    height: 6,
    dimensionalWeight: 6.04,
    declaredValue: 12_500,
    hsCode: '6404110000',
    countryOfOrigin: 'US',
    hasCustomsDuty: false,
    importDutyAmount: null,
    gctAmount: null,
    customsEntryNumber: null,
    customsClearedAt: null,
    customsHoldReason: null,
    isHazardous: false,
    condition: 'Good condition',
    collectedAt: null,
    collectedById: null,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_505_600,
    carrier: { name: 'FedEx' },
    branch: { name: 'Kingston' },
    mailbox: { number: 'RSJ1001' },
    ...overrides,
  }
}

describe('portal packages GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({ user: null })
    mocks.isSignedSession.mockReturnValue(false)
    mocks.getPortalTenant.mockResolvedValue(null)
    mocks.retrieveByTenantAndUser.mockResolvedValue(null)
    mocks.listPackages.mockResolvedValue([])
  })

  it('returns 401 for an unsigned session without resolving portal data', async () => {
    const session = { user: null }
    mocks.getAuthSession.mockResolvedValue(session)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      data: null,
      error: { code: 'auth/no-session', message: 'Unauthorized.' },
    })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.getAuthSession).toHaveBeenCalledWith()
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getPortalTenant).not.toHaveBeenCalled()
    expect(mocks.retrieveByTenantAndUser).not.toHaveBeenCalled()
    expect(mocks.listPackages).not.toHaveBeenCalled()
  })

  it('returns 404 when the signed session has no portal tenant', async () => {
    const session = createSession()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({
      data: null,
      error: { code: 'error/not-found', message: 'Portal unavailable.' },
    })
    expect(mocks.getPortalTenant).toHaveBeenCalledTimes(1)
    expect(mocks.getPortalTenant).toHaveBeenCalledWith()
    expect(mocks.retrieveByTenantAndUser).not.toHaveBeenCalled()
    expect(mocks.listPackages).not.toHaveBeenCalled()
  })

  it('returns 403 when the signed customer is not enrolled', async () => {
    const session = createSession()
    const tenant = createTenant()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'auth/forbidden',
        message: 'Portal enrollment is required.',
      },
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledWith(
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.listPackages).not.toHaveBeenCalled()
  })

  it('returns only packages scoped to the tenant and customer profile', async () => {
    const session = createSession()
    const tenant = createTenant()
    const profile = createProfile()
    const packages = [createPortalPackage()]
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)
    mocks.retrieveByTenantAndUser.mockResolvedValue(profile)
    mocks.listPackages.mockResolvedValue(packages)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ data: packages, error: null })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledWith(
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.listPackages).toHaveBeenCalledTimes(1)
    expect(mocks.listPackages).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })
  })

  it('returns a 500 envelope when the package service rejects unexpectedly', async () => {
    const session = createSession()
    const tenant = createTenant()
    const profile = createProfile()
    const serviceError = new Error('Database connection interrupted')
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)
    mocks.retrieveByTenantAndUser.mockResolvedValue(profile)
    mocks.listPackages.mockRejectedValue(serviceError)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'error/unknown',
        message: 'Failed to load packages.',
      },
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledWith(
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.listPackages).toHaveBeenCalledTimes(1)
    expect(mocks.listPackages).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })
  })
})
