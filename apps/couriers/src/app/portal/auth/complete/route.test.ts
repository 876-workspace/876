import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

import type { Tenant } from '@/lib/db'
import type { Signed876Session } from '@/types/auth'
import type { PortalCustomer } from '@/types/portal'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPortalTenant: vi.fn(),
  ensurePortalCustomer: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/portal/tenant', () => ({
  getPortalTenant: mocks.getPortalTenant,
}))
vi.mock('@/lib/portal/enroll', () => ({
  ensurePortalCustomer: mocks.ensurePortalCustomer,
}))

import { GET } from './route'

const SANITIZED_RETURN_TO_CASES = [
  ['external URL', 'https://evil.com'],
  ['protocol-relative URL', '//evil.com'],
  ['javascript URL', 'javascript:alert(1)'],
  ['non-portal internal path', '/admin'],
  ['empty string', ''],
  ['whitespace-only string', '  \t '],
  ['XSS payload', '<script>alert(1)</script>'],
  ['SQL injection', "' OR '1'='1"],
  ['prototype key', '__proto__'],
  ['10k characters', 'a'.repeat(10_000)],
] as const

function createRequest(returnTo?: string): NextRequest {
  const url = new URL(
    'https://rocketship.couriers.876.app/portal/auth/complete'
  )
  if (returnTo !== undefined) url.searchParams.set('returnTo', returnTo)

  return { nextUrl: url } as NextRequest
}

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

function createPortalCustomer(
  overrides: Partial<PortalCustomer> = {}
): PortalCustomer {
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
    primaryMailboxNumber: 'RSJ1001',
    ...overrides,
  }
}

describe('portal auth complete GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((path: string) => {
      throw Object.assign(new Error(`redirect:${path}`), { path })
    })
    mocks.getAuthSession.mockResolvedValue({ user: null })
    mocks.isSignedSession.mockReturnValue(false)
    mocks.getPortalTenant.mockResolvedValue(null)
    mocks.ensurePortalCustomer.mockResolvedValue({
      data: null,
      error: 'Portal enrollment could not be completed. Please try again.',
      status: 500,
      code: 'portal/enrollment-failed',
    })
  })

  it('redirects an unsigned visitor to portal login before tenant resolution', async () => {
    const session = { user: null }
    mocks.getAuthSession.mockResolvedValue(session)

    const action = GET(createRequest('/portal/packages'))

    await expect(action).rejects.toMatchObject({ path: '/portal/login' })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.getAuthSession).toHaveBeenCalledWith()
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getPortalTenant).not.toHaveBeenCalled()
    expect(mocks.ensurePortalCustomer).not.toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/portal/login')
  })

  it('redirects a signed visitor without a tenant to portal unavailable', async () => {
    const session = createSession()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)

    const action = GET(createRequest('/portal/packages'))

    await expect(action).rejects.toMatchObject({ path: '/portal/unavailable' })
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getPortalTenant).toHaveBeenCalledTimes(1)
    expect(mocks.getPortalTenant).toHaveBeenCalledWith()
    expect(mocks.ensurePortalCustomer).not.toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/portal/unavailable')
  })

  it('redirects an enrollment failure to portal login with an error', async () => {
    const session = createSession()
    const tenant = createTenant()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)

    const action = GET(createRequest('/portal/packages'))

    await expect(action).rejects.toMatchObject({
      path: '/portal/login?error=enrollment',
    })
    expect(mocks.ensurePortalCustomer).toHaveBeenCalledTimes(1)
    expect(mocks.ensurePortalCustomer).toHaveBeenCalledWith({
      tenant,
      userId: 'user_kimani',
      email: 'kimani@rocketship.test',
      firstName: 'Kimani',
      lastName: 'Brown',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/portal/login?error=enrollment'
    )
  })

  it('redirects a successful enrollment without returnTo to the portal root', async () => {
    const session = createSession()
    const tenant = createTenant()
    const customer = createPortalCustomer()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)
    mocks.ensurePortalCustomer.mockResolvedValue({
      data: customer,
      error: null,
    })

    const action = GET(createRequest())

    await expect(action).rejects.toMatchObject({ path: '/portal' })
    expect(mocks.ensurePortalCustomer).toHaveBeenCalledTimes(1)
    expect(mocks.ensurePortalCustomer).toHaveBeenCalledWith({
      tenant,
      userId: 'user_kimani',
      email: 'kimani@rocketship.test',
      firstName: 'Kimani',
      lastName: 'Brown',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/portal')
  })

  it.each(SANITIZED_RETURN_TO_CASES)(
    'sanitizes the %s return_to value to the portal root',
    async (_case, returnTo) => {
      const session = createSession()
      const tenant = createTenant()
      const customer = createPortalCustomer()
      mocks.getAuthSession.mockResolvedValue(session)
      mocks.isSignedSession.mockReturnValue(true)
      mocks.getPortalTenant.mockResolvedValue(tenant)
      mocks.ensurePortalCustomer.mockResolvedValue({
        data: customer,
        error: null,
      })

      const action = GET(createRequest(returnTo))

      await expect(action).rejects.toMatchObject({ path: '/portal' })
      expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
      expect(mocks.getPortalTenant).toHaveBeenCalledTimes(1)
      expect(mocks.ensurePortalCustomer).toHaveBeenCalledTimes(1)
      expect(mocks.ensurePortalCustomer).toHaveBeenCalledWith({
        tenant,
        userId: 'user_kimani',
        email: 'kimani@rocketship.test',
        firstName: 'Kimani',
        lastName: 'Brown',
      })
      expect(mocks.redirect).toHaveBeenCalledTimes(1)
      expect(mocks.redirect).toHaveBeenCalledWith('/portal')
    }
  )

  it('preserves a valid nested portal return target', async () => {
    const session = createSession()
    const tenant = createTenant()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPortalTenant.mockResolvedValue(tenant)
    mocks.ensurePortalCustomer.mockResolvedValue({
      data: createPortalCustomer(),
      error: null,
    })

    const action = GET(createRequest('/portal/packages/pkg_rocketship_1001'))

    await expect(action).rejects.toMatchObject({
      path: '/portal/packages/pkg_rocketship_1001',
    })
    expect(mocks.ensurePortalCustomer).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/portal/packages/pkg_rocketship_1001'
    )
  })

  it.each([
    ['dot-segment traversal', '/portal/../admin'],
    ['portal-prefixed sibling', '/portal-admin'],
  ] as const)(
    'falls back to /portal for the unsafe %s return target',
    async (_case, returnTo) => {
      const session = createSession()
      const tenant = createTenant()
      mocks.getAuthSession.mockResolvedValue(session)
      mocks.isSignedSession.mockReturnValue(true)
      mocks.getPortalTenant.mockResolvedValue(tenant)
      mocks.ensurePortalCustomer.mockResolvedValue({
        data: createPortalCustomer(),
        error: null,
      })

      const action = GET(createRequest(returnTo))

      await expect(action).rejects.toMatchObject({ path: '/portal' })
      expect(mocks.ensurePortalCustomer).toHaveBeenCalledTimes(1)
      expect(mocks.redirect).toHaveBeenCalledTimes(1)
      expect(mocks.redirect).toHaveBeenCalledWith('/portal')
    }
  )
})
