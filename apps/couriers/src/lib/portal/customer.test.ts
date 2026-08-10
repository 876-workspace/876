import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalCustomer } from '@876/couriers'

import type { CouriersTenant, Signed876Session } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPortalTenant: vi.fn(),
  createPortalCouriersClient: vi.fn(),
  retrievePortalCustomer: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('./client', () => ({
  createPortalCouriersClient: mocks.createPortalCouriersClient,
  isPortalNotFound: (result: { error: { code: string } | null }) =>
    result.error?.code.endsWith('/not-found') ?? false,
  requirePortalData: <T>(result: {
    data: T | null
    error: { code: string; message: string } | null
  }) => {
    if (result.error === null) return result.data as T
    throw new Error(result.error.message)
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

function createProfile(
  overrides: Partial<PortalCustomer> = {}
): PortalCustomer {
  return {
    object: 'courier_customer_profile',
    id: 'cprof_kimani',
    tenant_id: 'ten_rocketship',
    user_id: 'user_kimani',
    billing_customer_id: 'blcus_kimani',
    branch_id: 'br_kingston',
    status: 'ACTIVE',
    is_commercial: false,
    first_seen_at: 1_784_419_200,
    created_at: 1_784_419_200,
    updated_at: 1_784_419_200,
    deleted_at: null,
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
    mocks.createPortalCouriersClient.mockReturnValue({
      portal: { customer: { retrieve: mocks.retrievePortalCustomer } },
    })
    mocks.retrievePortalCustomer.mockResolvedValue({
      data: null,
      error: { code: 'customer/not-found', message: 'Not found.' },
    })
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
    expect(mocks.createPortalCouriersClient).not.toHaveBeenCalled()
    expect(mocks.retrievePortalCustomer).not.toHaveBeenCalled()
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
    expect(mocks.createPortalCouriersClient).not.toHaveBeenCalled()
    expect(mocks.retrievePortalCustomer).not.toHaveBeenCalled()
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
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledTimes(1)
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledWith(
      'access_kimani'
    )
    expect(mocks.retrievePortalCustomer).toHaveBeenCalledTimes(1)
    expect(mocks.retrievePortalCustomer).toHaveBeenCalledWith('ten_rocketship')
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
      expect(mocks.createPortalCouriersClient).toHaveBeenCalledTimes(1)
      expect(mocks.createPortalCouriersClient).toHaveBeenCalledWith(
        'access_kimani'
      )
      expect(mocks.retrievePortalCustomer).toHaveBeenCalledTimes(1)
      expect(mocks.retrievePortalCustomer).toHaveBeenCalledWith(
        'ten_rocketship'
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
    mocks.retrievePortalCustomer.mockResolvedValue({
      data: profile,
      error: null,
    })

    const result = await requirePortalCustomer('/portal/packages')

    expect(result).toEqual({ session, tenant, profile })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getPortalTenant).toHaveBeenCalledTimes(1)
    expect(mocks.getPortalTenant).toHaveBeenCalledWith()
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledTimes(1)
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledWith(
      'access_kimani'
    )
    expect(mocks.retrievePortalCustomer).toHaveBeenCalledTimes(1)
    expect(mocks.retrievePortalCustomer).toHaveBeenCalledWith('ten_rocketship')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
