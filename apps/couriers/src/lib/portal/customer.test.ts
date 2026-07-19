import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CourierCustomerProfile, Tenant } from '@/lib/db'
import type { Signed876Session } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPortalTenant: vi.fn(),
  retrieveByTenantAndUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/service', () => ({
  service: {
    customerProfiles: {
      retrieveByTenantAndUser: mocks.retrieveByTenantAndUser,
    },
  },
}))
vi.mock('./tenant', () => ({ getPortalTenant: mocks.getPortalTenant }))

import { requirePortalCustomer } from './customer'

const RETURN_TO_SECURITY_INPUTS = [
  ['external URL', 'https://evil.com'],
  ['protocol-relative URL', '//evil.com'],
  ['javascript URL', 'javascript:alert(1)'],
  ['path traversal', '/portal/../admin'],
  ['empty string', ''],
  ['whitespace-only string', '  \t '],
  ['XSS payload', '<script>alert(1)</script>'],
  ['10k characters', 'a'.repeat(10_000)],
] as const

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

describe('requirePortalCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((path: string) => {
      throw Object.assign(new Error(`redirect:${path}`), { path })
    })
    mocks.getAuthSession.mockResolvedValue({ user: null })
    mocks.isSignedSession.mockReturnValue(false)
    mocks.getPortalTenant.mockResolvedValue(null)
    mocks.retrieveByTenantAndUser.mockResolvedValue(null)
  })

  it('redirects an unsigned visitor to login without a root return parameter', async () => {
    const session = { user: null }
    mocks.getAuthSession.mockResolvedValue(session)

    const action = requirePortalCustomer('/portal')

    await expect(action).rejects.toMatchObject({ path: '/portal/login' })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.getAuthSession).toHaveBeenCalledWith()
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getPortalTenant).not.toHaveBeenCalled()
    expect(mocks.retrieveByTenantAndUser).not.toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/portal/login')
  })

  it('redirects a signed visitor without a tenant to portal unavailable', async () => {
    const session = createSession()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)

    const action = requirePortalCustomer('/portal/packages')

    await expect(action).rejects.toMatchObject({ path: '/portal/unavailable' })
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getPortalTenant).toHaveBeenCalledTimes(1)
    expect(mocks.getPortalTenant).toHaveBeenCalledWith()
    expect(mocks.retrieveByTenantAndUser).not.toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/portal/unavailable')
  })

  it('redirects an unenrolled customer without a root return parameter', async () => {
    const session = createSession()
    const tenant = createTenant()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)

    const action = requirePortalCustomer('/portal')

    await expect(action).rejects.toMatchObject({
      path: '/portal/auth/complete',
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledWith(
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/portal/auth/complete')
  })

  it.each(RETURN_TO_SECURITY_INPUTS)(
    'encodes the %s return target when forwarding to enrollment',
    async (_case, returnTo) => {
      const session = createSession()
      const tenant = createTenant()
      mocks.getAuthSession.mockResolvedValue(session)
      mocks.isSignedSession.mockReturnValue(true)
      mocks.getPortalTenant.mockResolvedValue(tenant)
      const expectedQuery = new URLSearchParams({ returnTo }).toString()
      const expectedPath = `/portal/auth/complete?${expectedQuery}`

      const action = requirePortalCustomer(returnTo)

      await expect(action).rejects.toMatchObject({ path: expectedPath })
      expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
      expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
      expect(mocks.getPortalTenant).toHaveBeenCalledTimes(1)
      expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
      expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledWith(
        'ten_rocketship',
        'user_kimani'
      )
      expect(mocks.redirect).toHaveBeenCalledTimes(1)
      expect(mocks.redirect).toHaveBeenCalledWith(expectedPath)
    }
  )

  it('returns the signed session, tenant, and enrolled profile', async () => {
    const session = createSession()
    const tenant = createTenant()
    const profile = createProfile()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)
    mocks.retrieveByTenantAndUser.mockResolvedValue(profile)

    const result = await requirePortalCustomer('/portal/packages')

    expect(result).toEqual({ session, tenant, profile })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getPortalTenant).toHaveBeenCalledTimes(1)
    expect(mocks.getPortalTenant).toHaveBeenCalledWith()
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledWith(
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
