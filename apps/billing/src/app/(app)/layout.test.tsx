import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireValidSession: vi.fn(),
  getContext: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getFeatures: vi.fn(),
  createAuthLoginPath: vi.fn(
    (p: string) => `/login?next=${encodeURIComponent(p)}`
  ),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/guards', () => ({
  requireValidSession: mocks.requireValidSession,
}))
vi.mock('@/lib/auth/billing-context', () => ({ getContext: mocks.getContext }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/features', () => ({ getFeatures: mocks.getFeatures }))
vi.mock('@876/core/auth/return-to', () => ({
  createAuthLoginPath: mocks.createAuthLoginPath,
}))
vi.mock('@/components/shell/shell', () => ({
  Shell: (props: Record<string, unknown>) => {
    ;(globalThis as unknown as { __shellProps: unknown }).__shellProps = props
    return null
  },
}))

import AppLayout from './layout'

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    tenant: { id: 'ten_1', name: 'Island', organizationId: 'org_123' },
    access: { status: 'ACTIVE', permissions: ['billing:access'] },
    permissions: ['billing:access'],
    accessStatus: 'active',
    role: 'super-admin',
    orgId: 'org_123',
    organizations: [{ id: 'org_123', name: 'Island', slug: 'island' }],
    ...overrides,
  } as unknown as Awaited<
    ReturnType<typeof import('@/lib/auth/billing-context').getContext>
  >
}

const sessionUser = {
  id: 'user_123',
  firstName: 'Alej',
  lastName: 'R',
  email: 'a@b.com',
  avatar: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.redirect.mockImplementation((p: string) => {
    throw Object.assign(new Error(`redirect:${p}`), { path: p })
  })
  mocks.requireValidSession.mockResolvedValue(undefined)
  mocks.getAuthSession.mockResolvedValue({ user: sessionUser })
  mocks.isSignedSession.mockReturnValue(true)
  mocks.getFeatures.mockResolvedValue({ productFeatures: {}, uiFeatures: {} })
  mocks.getContext.mockResolvedValue(makeContext())
  delete (globalThis as unknown as { __shellProps: unknown }).__shellProps
})

describe('AppLayout — billing entitlement gates', () => {
  it('When valid session, then requires validation with root path', async () => {
    await AppLayout({ children: null }).catch(() => {})
    expect(mocks.requireValidSession).toHaveBeenCalledWith('/')
    expect(mocks.requireValidSession).toHaveBeenCalledTimes(1)
  })

  it('When no context and unsigned session, then redirects to login', async () => {
    mocks.getContext.mockResolvedValue(null)
    mocks.isSignedSession.mockReturnValue(false)
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: `/login?next=${encodeURIComponent('/')}`,
    })
  })

  it('When no context and signed session with no org, then redirects to get-started', async () => {
    mocks.getContext.mockResolvedValue(null)
    mocks.isSignedSession.mockReturnValue(true)
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/get-started',
    })
  })

  it('When tenant missing and role is member, then redirects to no-access (no org creation for member)', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({ tenant: null, role: 'staff', accessStatus: 'active' })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
  })

  it('When tenant missing and role is owner, then redirects to get-started', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({ tenant: null, role: 'super-admin', accessStatus: 'active' })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/get-started',
    })
  })

  it('When tenant missing and role is admin, then redirects to get-started', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({ tenant: null, role: 'admin', accessStatus: 'active' })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/get-started',
    })
  })

  it('When accessStatus is blocked even with active workspace, then redirects to no-access', async () => {
    mocks.getContext.mockResolvedValue(makeContext({ accessStatus: 'blocked' }))
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
  })

  it('When accessStatus is blocked and tenant missing for owner, tenant gate wins (goes to get-started)', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({ tenant: null, role: 'super-admin', accessStatus: 'blocked' })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/get-started',
    })
  })

  it('When accessStatus is none and role member, then redirects to no-access', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({ accessStatus: 'none', role: 'staff' })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
  })

  it('When accessStatus is none and role owner, then redirects to get-started (reactivate)', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({ accessStatus: 'none', role: 'super-admin' })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/get-started',
    })
  })

  it('When accessStatus is none and role admin, then redirects to get-started', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({ accessStatus: 'none', role: 'admin' })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/get-started',
    })
  })

  it('When tenant present but access null, then redirects to no-access', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({ access: null, permissions: [] })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
  })

  it('When access suspended, then redirects to no-access', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({
        access: { status: 'SUSPENDED', permissions: ['billing:access'] },
        permissions: [],
      })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
  })

  it('When missing billing:access permission, then redirects to no-access', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({
        access: { status: 'ACTIVE', permissions: ['sales:read'] },
        permissions: ['sales:read'],
      })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
  })

  it('When current org not in organizations list, then redirects to no-access', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({
        organizations: [{ id: 'other', name: 'Other', slug: 'other' }],
      })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
  })

  it('When all gates pass, then renders Shell with tenant, user, features and orgs', async () => {
    mocks.getFeatures.mockResolvedValue({
      productFeatures: { sales: true },
      uiFeatures: {},
    })
    const result = (await AppLayout({
      children: 'CHILD' as unknown as React.ReactNode,
    })) as unknown as { props: Record<string, unknown>; type: unknown }
    expect(result).toBeDefined()
    expect((result.props as { tenantName: string }).tenantName).toBe('Island')
    expect((result.props as { user: { email: string } }).user.email).toBe(
      'a@b.com'
    )
    expect((result.props as { features: unknown }).features).toEqual({
      productFeatures: { sales: true },
      uiFeatures: {},
    })
  })

  it('When session lacks lastName, then user display name falls back to email', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: {
        id: 'user_123',
        firstName: '',
        lastName: '',
        email: 'a@b.com',
        avatar: null,
      },
    })
    const result = (await AppLayout({ children: null })) as unknown as {
      props: Record<string, unknown>
    }
    expect((result.props as { user: { name: string } }).user.name).toBe(
      'a@b.com'
    )
  })

  it('When accessStatus undefined treated as not active, then member goes to no-access', async () => {
    mocks.getContext.mockResolvedValue(
      makeContext({
        accessStatus: undefined as unknown as string,
        role: 'staff',
      })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
  })

  it('Order: tenant missing checked before accessStatus blocked — member with no tenant still gets no-access', async () => {
    // Both conditions true, but current code checks tenant first, then blocked, then none.
    // Either path gives no-access, but we verify requireValidSession still called once.
    mocks.getContext.mockResolvedValue(
      makeContext({ tenant: null, role: 'staff', accessStatus: 'blocked' })
    )
    await expect(AppLayout({ children: null })).rejects.toMatchObject({
      path: '/no-access',
    })
    expect(mocks.requireValidSession).toHaveBeenCalledTimes(1)
  })
})
