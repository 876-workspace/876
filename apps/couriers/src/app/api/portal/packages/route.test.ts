import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalPackage } from '@876/couriers'

import { getError } from '@/lib/errors'
import type { CouriersTenant, Signed876Session } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPortalTenant: vi.fn(),
  createPortalCouriersClient: vi.fn(),
  listAllPortalPackages: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/portal/tenant', () => ({
  getPortalTenant: mocks.getPortalTenant,
}))
vi.mock('@/lib/portal/client', () => ({
  createPortalCouriersClient: mocks.createPortalCouriersClient,
  listAllPortalPackages: mocks.listAllPortalPackages,
  isPortalNotFound: (result: { error: { code: string } | null }) =>
    result.error?.code.endsWith('/not-found') ?? false,
  requirePortalData: <T>(result: {
    data: T | null
    error: { code: string; message: string } | null
  }) => {
    if (result.error === null) return result.data as T
    throw new Error(result.error.message)
  },
  toPortalPackageListItem: (packageItem: PortalPackage) => ({
    id: packageItem.id,
    trackingNum: packageItem.tracking_num,
    status: packageItem.status,
    description: packageItem.description,
    createdAt: packageItem.created_at,
  }),
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

function createTenant(overrides: Partial<CouriersTenant> = {}): CouriersTenant {
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

function createPortalPackage(
  overrides: Partial<PortalPackage> = {}
): PortalPackage {
  return {
    object: 'package',
    id: 'pkg_rocketship_1001',
    tenant_id: 'ten_rocketship',
    customer_id: 'cprof_kimani',
    branch_id: 'br_kingston',
    mailbox_id: 'mbx_rsj1001',
    tracking_num: 'FX876JM1001',
    status: 'READY_FOR_PICKUP',
    package_type: 'CARTON',
    description: 'Running shoes',
    quantity: 1,
    actual_weight: 4.5,
    chargeable_weight: 4.5,
    carrier: { id: 'carrier_fedex', name: 'FedEx' },
    branch: { id: 'br_kingston', name: 'Kingston' },
    mailbox: { id: 'mbx_rsj1001', number: 'RSJ1001' },
    collected_at: null,
    created_at: 1_784_419_200,
    updated_at: 1_784_505_600,
    ...overrides,
  }
}

describe('portal packages GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({ user: null })
    mocks.isSignedSession.mockReturnValue(false)
    mocks.getPortalTenant.mockResolvedValue(null)
    mocks.createPortalCouriersClient.mockReturnValue({})
    mocks.listAllPortalPackages.mockResolvedValue({ data: [], error: null })
  })

  it('returns 401 for an unsigned session without resolving portal data', async () => {
    const session = { user: null }
    mocks.getAuthSession.mockResolvedValue(session)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'auth/no-session',
        message: getError('auth/no-session').message,
      },
    })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.getAuthSession).toHaveBeenCalledWith()
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getPortalTenant).not.toHaveBeenCalled()
    expect(mocks.createPortalCouriersClient).not.toHaveBeenCalled()
    expect(mocks.listAllPortalPackages).not.toHaveBeenCalled()
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
      error: {
        code: 'portal/unavailable',
        message: getError('portal/unavailable').message,
      },
    })
    expect(mocks.getPortalTenant).toHaveBeenCalledTimes(1)
    expect(mocks.getPortalTenant).toHaveBeenCalledWith()
    expect(mocks.createPortalCouriersClient).not.toHaveBeenCalled()
    expect(mocks.listAllPortalPackages).not.toHaveBeenCalled()
  })

  it('returns 403 when the signed customer is not enrolled', async () => {
    const session = createSession()
    const tenant = createTenant()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)
    mocks.listAllPortalPackages.mockResolvedValue({
      data: null,
      error: { code: 'customer/not-found', message: 'Not found.' },
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'portal/enrollment-required',
        message: getError('portal/enrollment-required').message,
      },
    })
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledTimes(1)
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledWith(
      'access_kimani'
    )
    expect(mocks.listAllPortalPackages).toHaveBeenCalledTimes(1)
    expect(mocks.listAllPortalPackages).toHaveBeenCalledWith(
      expect.anything(),
      'ten_rocketship'
    )
  })

  it('returns session-scoped package-list views', async () => {
    const session = createSession()
    const tenant = createTenant()
    const packages = [createPortalPackage()]
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)
    mocks.listAllPortalPackages.mockResolvedValue({
      data: packages,
      error: null,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      data: [
        {
          id: 'pkg_rocketship_1001',
          trackingNum: 'FX876JM1001',
          status: 'READY_FOR_PICKUP',
          description: 'Running shoes',
          createdAt: 1_784_419_200,
        },
      ],
      error: null,
    })
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledTimes(1)
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledWith(
      'access_kimani'
    )
    expect(mocks.listAllPortalPackages).toHaveBeenCalledTimes(1)
    expect(mocks.listAllPortalPackages).toHaveBeenCalledWith(
      expect.anything(),
      'ten_rocketship'
    )
  })

  it('returns a 500 envelope when the Couriers API rejects unexpectedly', async () => {
    const session = createSession()
    const tenant = createTenant()
    const serviceError = new Error('Couriers API unavailable')
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)
    mocks.listAllPortalPackages.mockRejectedValue(serviceError)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'portal/packages-unavailable',
        message: getError('portal/packages-unavailable').message,
      },
    })
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledTimes(1)
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledWith(
      'access_kimani'
    )
    expect(mocks.listAllPortalPackages).toHaveBeenCalledTimes(1)
    expect(mocks.listAllPortalPackages).toHaveBeenCalledWith(
      expect.anything(),
      'ten_rocketship'
    )
  })
})
