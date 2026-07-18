import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  canManageBilling,
  getContext,
  getSetupContext,
  getWorkspaceContext,
  hasPermission,
  normalizeOrgRole,
  requireBillingFeature,
  requirePagePermission,
} from './billing-context'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPlatformClient: vi.fn(),
  getRoutingMemberships: vi.fn(),
  retrieveSubscriptionBySlug: vi.fn(),
  listByOrganizationIds: vi.fn(),
  resolveMember: vi.fn(),
  getFeatures: vi.fn(),
  getCookie: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  }
})
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.getCookie }),
}))
vi.mock('@/lib/billing-app', () => ({ BILLING_APP_SLUG: '876-billing' }))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/features', () => ({ getFeatures: mocks.getFeatures }))
vi.mock('@/lib/service', () => ({
  service: {
    tenants: { listByOrganizationIds: mocks.listByOrganizationIds },
    members: { resolve: mocks.resolveMember },
  },
}))
vi.mock('./session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))

type MembershipFixture = {
  role: string
  organization: {
    id: string
    name: string
    slug: string
    status: string
  }
}

function createMembership(
  id: string,
  overrides: Partial<MembershipFixture> = {}
): MembershipFixture {
  return {
    role: 'owner',
    organization: {
      id,
      name: `Organization ${id}`,
      slug: `organization-${id}`,
      status: 'active',
    },
    ...overrides,
  }
}

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const

const tenant = {
  id: 'ten_123',
  organizationId: 'org_123',
  name: 'Efesto Technologies',
}

const access = {
  userId: 'user_123',
  status: 'ACTIVE',
  permissions: ['billing:access', 'sales:read'],
  role: { id: 'role_123', slug: 'owner', name: 'Owner' },
}

const allFeatures = {
  sales: true,
  quotes: true,
  invoices: true,
  subscriptions: true,
  purchases: true,
  vendors: true,
  expenses: true,
  banking: true,
  documents: true,
}

describe('Billing context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((path: string) => {
      throw Object.assign(new Error(`redirect:${path}`), { path })
    })
    mocks.getAuthSession.mockResolvedValue({
      user: {
        id: 'user_123',
        email: 'alejandra@example.com',
        orgId: 'org_123',
      },
    })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPlatformClient.mockResolvedValue({
      auth: { getRoutingMemberships: mocks.getRoutingMemberships },
      orgs: {
        subscriptions: { retrieveBySlug: mocks.retrieveSubscriptionBySlug },
      },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [createMembership('org_123')] },
      error: null,
    })
    mocks.listByOrganizationIds.mockResolvedValue([tenant])
    mocks.retrieveSubscriptionBySlug.mockResolvedValue({
      data: { status: 'active', items: [{ price_id: 'price_internal' }] },
      error: null,
    })
    mocks.resolveMember.mockResolvedValue(access)
    mocks.getFeatures.mockResolvedValue({
      uiFeatures: {},
      productFeatures: allFeatures,
    })
    mocks.getCookie.mockReturnValue(undefined)
  })

  it('returns null for an unsigned session without loading platform data', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const result = await getContext()

    expect(result).toBeNull()
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
    expect(mocks.getRoutingMemberships).not.toHaveBeenCalled()
  })

  it('returns null when routing memberships fail', async () => {
    mocks.getRoutingMemberships.mockResolvedValue({
      data: null,
      error: { message: 'Unavailable.' },
    })

    const result = await getContext()

    expect(result).toBeNull()
    expect(mocks.getRoutingMemberships).toHaveBeenCalledTimes(1)
    expect(mocks.getRoutingMemberships).toHaveBeenCalledWith({
      userId: 'user_123',
      status: 'active',
    })
    expect(mocks.listByOrganizationIds).not.toHaveBeenCalled()
  })

  it('filters inactive organizations and returns null when none remain', async () => {
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [
          createMembership('org_archived', {
            organization: {
              id: 'org_archived',
              name: 'Archived',
              slug: 'archived',
              status: 'archived',
            },
          }),
        ],
      },
      error: null,
    })

    const result = await getContext()

    expect(result).toBeNull()
    expect(mocks.listByOrganizationIds).not.toHaveBeenCalled()
  })

  it('builds active workspace context for the preferred organization', async () => {
    const result = await getContext()

    expect(result).toEqual({
      userId: 'user_123',
      orgId: 'org_123',
      orgName: 'Organization org_123',
      orgSlug: 'organization-org_123',
      role: 'owner',
      organizations: [
        {
          id: 'org_123',
          name: 'Organization org_123',
          slug: 'organization-org_123',
          role: 'owner',
        },
      ],
      accessStatus: 'active',
      tenant,
      access,
      permissions: ['billing:access', 'sales:read'],
    })
    expect(mocks.getCookie).toHaveBeenCalledTimes(1)
    expect(mocks.getCookie).toHaveBeenCalledWith('billing_active_org')
    expect(mocks.listByOrganizationIds).toHaveBeenCalledTimes(1)
    expect(mocks.listByOrganizationIds).toHaveBeenCalledWith(['org_123'])
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'org_123',
      '876-billing'
    )
    expect(mocks.resolveMember).toHaveBeenCalledTimes(1)
    expect(mocks.resolveMember).toHaveBeenCalledWith(
      'ten_123',
      'user_123',
      'owner'
    )
  })

  it('selects a validated active cookie over both the session organization and tenant-first fallback', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: {
        id: 'user_123',
        email: 'alejandra@example.com',
        orgId: 'org_session',
      },
    })
    mocks.getCookie.mockReturnValue({ value: 'org_cookie' })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [
          createMembership('org_123'),
          createMembership('org_session', { role: 'viewer' }),
          createMembership('org_cookie', { role: 'admin' }),
        ],
      },
      error: null,
    })

    const result = await getContext()

    expect(result).toEqual({
      userId: 'user_123',
      orgId: 'org_cookie',
      orgName: 'Organization org_cookie',
      orgSlug: 'organization-org_cookie',
      role: 'admin',
      organizations: [
        {
          id: 'org_123',
          name: 'Organization org_123',
          slug: 'organization-org_123',
          role: 'owner',
        },
        {
          id: 'org_session',
          name: 'Organization org_session',
          slug: 'organization-org_session',
          role: 'member',
        },
        {
          id: 'org_cookie',
          name: 'Organization org_cookie',
          slug: 'organization-org_cookie',
          role: 'admin',
        },
      ],
      accessStatus: 'active',
      tenant: null,
      access: null,
      permissions: [],
    })
    expect(mocks.getCookie).toHaveBeenCalledTimes(1)
    expect(mocks.getCookie).toHaveBeenCalledWith('billing_active_org')
    expect(mocks.listByOrganizationIds).toHaveBeenCalledTimes(1)
    expect(mocks.listByOrganizationIds).toHaveBeenCalledWith([
      'org_123',
      'org_session',
      'org_cookie',
    ])
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'org_cookie',
      '876-billing'
    )
    expect(mocks.resolveMember).not.toHaveBeenCalled()
  })

  it('falls back to the sealed-session organization when the cookie is not a membership', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: {
        id: 'user_123',
        email: 'alejandra@example.com',
        orgId: 'org_session',
      },
    })
    mocks.getCookie.mockReturnValue({ value: 'org_unavailable' })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [
          createMembership('org_123'),
          createMembership('org_session', { role: 'admin' }),
        ],
      },
      error: null,
    })

    const result = await getContext()

    expect(result).toEqual({
      userId: 'user_123',
      orgId: 'org_session',
      orgName: 'Organization org_session',
      orgSlug: 'organization-org_session',
      role: 'admin',
      organizations: [
        {
          id: 'org_123',
          name: 'Organization org_123',
          slug: 'organization-org_123',
          role: 'owner',
        },
        {
          id: 'org_session',
          name: 'Organization org_session',
          slug: 'organization-org_session',
          role: 'admin',
        },
      ],
      accessStatus: 'active',
      tenant: null,
      access: null,
      permissions: [],
    })
    expect(mocks.getCookie).toHaveBeenCalledTimes(1)
    expect(mocks.getCookie).toHaveBeenCalledWith('billing_active_org')
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'org_session',
      '876-billing'
    )
    expect(mocks.resolveMember).not.toHaveBeenCalled()
  })

  it('filters an inactive cookie organization and falls back to the sealed-session organization', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: {
        id: 'user_123',
        email: 'alejandra@example.com',
        orgId: 'org_session',
      },
    })
    mocks.getCookie.mockReturnValue({ value: 'org_inactive' })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [
          createMembership('org_inactive', {
            organization: {
              id: 'org_inactive',
              name: 'Inactive Organization',
              slug: 'inactive-organization',
              status: 'inactive',
            },
          }),
          createMembership('org_session', { role: 'viewer' }),
        ],
      },
      error: null,
    })

    const result = await getContext()

    expect(result).toEqual({
      userId: 'user_123',
      orgId: 'org_session',
      orgName: 'Organization org_session',
      orgSlug: 'organization-org_session',
      role: 'member',
      organizations: [
        {
          id: 'org_session',
          name: 'Organization org_session',
          slug: 'organization-org_session',
          role: 'member',
        },
      ],
      accessStatus: 'active',
      tenant: null,
      access: null,
      permissions: [],
    })
    expect(mocks.listByOrganizationIds).toHaveBeenCalledTimes(1)
    expect(mocks.listByOrganizationIds).toHaveBeenCalledWith(['org_session'])
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'org_session',
      '876-billing'
    )
    expect(mocks.resolveMember).not.toHaveBeenCalled()
  })

  it.each(SECURITY_INPUTS)(
    'treats untrusted cookie input %# only as a hint',
    async (cookieValue) => {
      mocks.getCookie.mockReturnValue({ value: cookieValue })

      const result = await getContext()

      expect(result).toEqual({
        userId: 'user_123',
        orgId: 'org_123',
        orgName: 'Organization org_123',
        orgSlug: 'organization-org_123',
        role: 'owner',
        organizations: [
          {
            id: 'org_123',
            name: 'Organization org_123',
            slug: 'organization-org_123',
            role: 'owner',
          },
        ],
        accessStatus: 'active',
        tenant,
        access,
        permissions: ['billing:access', 'sales:read'],
      })
      expect(mocks.getCookie).toHaveBeenCalledTimes(1)
      expect(mocks.getCookie).toHaveBeenCalledWith('billing_active_org')
      expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
      expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
        'org_123',
        '876-billing'
      )
    }
  )

  it('exposes exactly the active organizations with normalized roles', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: {
        id: 'user_123',
        email: 'alejandra@example.com',
        orgId: 'org_owner',
      },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [
          createMembership('org_owner'),
          createMembership('org_admin', { role: 'admin' }),
          createMembership('org_viewer', { role: 'viewer' }),
          createMembership('org_archived', {
            organization: {
              id: 'org_archived',
              name: 'Archived Organization',
              slug: 'archived-organization',
              status: 'archived',
            },
          }),
        ],
      },
      error: null,
    })
    mocks.listByOrganizationIds.mockResolvedValue([])

    const result = await getContext()

    expect(result).toEqual({
      userId: 'user_123',
      orgId: 'org_owner',
      orgName: 'Organization org_owner',
      orgSlug: 'organization-org_owner',
      role: 'owner',
      organizations: [
        {
          id: 'org_owner',
          name: 'Organization org_owner',
          slug: 'organization-org_owner',
          role: 'owner',
        },
        {
          id: 'org_admin',
          name: 'Organization org_admin',
          slug: 'organization-org_admin',
          role: 'admin',
        },
        {
          id: 'org_viewer',
          name: 'Organization org_viewer',
          slug: 'organization-org_viewer',
          role: 'member',
        },
      ],
      accessStatus: 'active',
      tenant: null,
      access: null,
      permissions: [],
    })
    expect(mocks.listByOrganizationIds).toHaveBeenCalledTimes(1)
    expect(mocks.listByOrganizationIds).toHaveBeenCalledWith([
      'org_owner',
      'org_admin',
      'org_viewer',
    ])
    expect(mocks.resolveMember).not.toHaveBeenCalled()
  })

  it('selects the first membership with an existing tenant when no preference matches', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_123', email: '', orgId: 'org_missing' },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [
          createMembership('org_without_tenant'),
          createMembership('org_123'),
        ],
      },
      error: null,
    })

    const result = await getContext()

    expect(result).toEqual({
      userId: 'user_123',
      orgId: 'org_123',
      orgName: 'Organization org_123',
      orgSlug: 'organization-org_123',
      role: 'owner',
      organizations: [
        {
          id: 'org_without_tenant',
          name: 'Organization org_without_tenant',
          slug: 'organization-org_without_tenant',
          role: 'owner',
        },
        {
          id: 'org_123',
          name: 'Organization org_123',
          slug: 'organization-org_123',
          role: 'owner',
        },
      ],
      accessStatus: 'active',
      tenant,
      access,
      permissions: ['billing:access', 'sales:read'],
    })
    expect(mocks.getCookie).toHaveBeenCalledTimes(1)
    expect(mocks.getCookie).toHaveBeenCalledWith('billing_active_org')
    expect(mocks.resolveMember).toHaveBeenCalledTimes(1)
    expect(mocks.resolveMember).toHaveBeenCalledWith(
      'ten_123',
      'user_123',
      'owner'
    )
  })

  it('falls back to the first membership when no organization has a tenant', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_123', email: '', orgId: null },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [createMembership('org_first'), createMembership('org_second')],
      },
      error: null,
    })
    mocks.listByOrganizationIds.mockResolvedValue([
      { ...tenant, id: 'ten_orphan', organizationId: null },
    ])

    const result = await getContext()

    expect(result).toEqual({
      userId: 'user_123',
      orgId: 'org_first',
      orgName: 'Organization org_first',
      orgSlug: 'organization-org_first',
      role: 'owner',
      organizations: [
        {
          id: 'org_first',
          name: 'Organization org_first',
          slug: 'organization-org_first',
          role: 'owner',
        },
        {
          id: 'org_second',
          name: 'Organization org_second',
          slug: 'organization-org_second',
          role: 'owner',
        },
      ],
      accessStatus: 'active',
      tenant: null,
      access: null,
      permissions: [],
    })
    expect(mocks.getCookie).toHaveBeenCalledTimes(1)
    expect(mocks.getCookie).toHaveBeenCalledWith('billing_active_org')
    expect(mocks.resolveMember).not.toHaveBeenCalled()
  })

  it.each([
    ['subscription error', { data: null, error: { message: 'Missing.' } }],
    ['missing subscription data', { data: null, error: null }],
  ])('maps %s to no Billing access', async (_name, subscriptionResult) => {
    mocks.retrieveSubscriptionBySlug.mockResolvedValue(subscriptionResult)

    const result = await getContext()

    expect(result).toEqual(
      expect.objectContaining({
        accessStatus: 'none',
        tenant,
        access: null,
        permissions: [],
      })
    )
    expect(mocks.resolveMember).not.toHaveBeenCalled()
  })

  it('retains a blocked Billing access status without resolving a member', async () => {
    mocks.retrieveSubscriptionBySlug.mockResolvedValue({
      data: { status: 'blocked', items: [{ price_id: 'price_internal' }] },
      error: null,
    })

    const result = await getContext()

    expect(result?.accessStatus).toBe('blocked')
    expect(result?.access).toBeNull()
    expect(result?.permissions).toEqual([])
    expect(mocks.resolveMember).not.toHaveBeenCalled()
  })

  it('denies Billing access when the subscription has no plan item', async () => {
    mocks.retrieveSubscriptionBySlug.mockResolvedValue({
      data: { status: 'active', items: [] },
      error: null,
    })

    const result = await getContext()

    expect(result?.accessStatus).toBe('none')
    expect(result?.access).toBeNull()
    expect(mocks.resolveMember).not.toHaveBeenCalled()
  })

  it('withholds permissions for a suspended Billing member', async () => {
    mocks.resolveMember.mockResolvedValue({
      ...access,
      status: 'SUSPENDED',
    })

    const result = await getContext()

    expect(result?.access).toEqual({ ...access, status: 'SUSPENDED' })
    expect(result?.permissions).toEqual([])
  })

  it.each([
    ['owner', 'owner'],
    ['admin', 'admin'],
    ['member', 'member'],
    ['viewer', 'member'],
    ['', 'member'],
  ] as const)('normalizes organization role %j to %s', (role, expected) => {
    expect(normalizeOrgRole(role)).toBe(expected)
  })

  it.each([
    ['owner', true],
    ['admin', true],
    ['member', false],
  ] as const)('classifies %s management access as %s', (role, expected) => {
    expect(canManageBilling(role)).toBe(expected)
  })

  it('checks context permission membership', () => {
    expect(
      hasPermission({ permissions: ['billing:access'] }, 'billing:access')
    ).toBe(true)
  })

  it('rejects a missing context permission', () => {
    expect(hasPermission({ permissions: [] }, 'billing:access')).toBe(false)
  })

  it.each([
    ['no tenant', { tenants: [] }],
    ['blocked subscription', { subscriptionStatus: 'blocked' }],
    ['no member access', { memberAccess: null }],
    ['suspended member', { memberStatus: 'SUSPENDED' }],
    ['missing Billing permission', { permissions: ['sales:read'] }],
  ])('returns null workspace context for %s', async (_name, scenario) => {
    if ('tenants' in scenario) mocks.listByOrganizationIds.mockResolvedValue([])
    if ('subscriptionStatus' in scenario)
      mocks.retrieveSubscriptionBySlug.mockResolvedValue({
        data: {
          status: scenario.subscriptionStatus,
          items: [{ price_id: 'price_internal' }],
        },
        error: null,
      })
    if ('memberAccess' in scenario)
      mocks.resolveMember.mockResolvedValue(scenario.memberAccess)
    if ('memberStatus' in scenario)
      mocks.resolveMember.mockResolvedValue({
        ...access,
        status: scenario.memberStatus,
      })
    if ('permissions' in scenario)
      mocks.resolveMember.mockResolvedValue({
        ...access,
        permissions: scenario.permissions,
      })

    const result = await getWorkspaceContext()

    expect(result).toBeNull()
  })

  it('returns a context narrowed to active tenant and access', async () => {
    const result = await getWorkspaceContext()

    expect(result).toEqual(
      expect.objectContaining({
        tenant,
        access,
        permissions: ['billing:access', 'sales:read'],
      })
    )
  })

  it('aliases setup context to the authenticated organization context', () => {
    expect(getSetupContext).toBe(getContext)
  })

  it('returns context for an authorized page permission', async () => {
    const result = await requirePagePermission('sales:read')

    expect(result).toEqual(
      expect.objectContaining({ userId: 'user_123', tenant, access })
    )
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('redirects when the requested page permission is missing', async () => {
    await expect(requirePagePermission('sales:write')).rejects.toMatchObject({
      path: '/no-access?reason=permission',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/no-access?reason=permission')
  })

  it('redirects feature checks when there is no workspace context', async () => {
    mocks.listByOrganizationIds.mockResolvedValue([])

    await expect(requireBillingFeature('sales')).rejects.toMatchObject({
      path: '/no-access',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/no-access')
    expect(mocks.getFeatures).not.toHaveBeenCalled()
  })

  it('redirects a disabled Billing product feature', async () => {
    mocks.getFeatures.mockResolvedValue({
      uiFeatures: {},
      productFeatures: { ...allFeatures, quotes: false },
    })

    await expect(requireBillingFeature('quotes')).rejects.toMatchObject({
      path: '/',
    })
    expect(mocks.getFeatures).toHaveBeenCalledTimes(1)
    expect(mocks.getFeatures).toHaveBeenCalledWith({
      userId: 'user_123',
      organizationId: 'org_123',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/')
  })

  it('returns context for an enabled Billing product feature', async () => {
    const result = await requireBillingFeature('quotes')

    expect(result).toEqual(
      expect.objectContaining({ userId: 'user_123', tenant, access })
    )
    expect(mocks.getFeatures).toHaveBeenCalledTimes(1)
    expect(mocks.getFeatures).toHaveBeenCalledWith({
      userId: 'user_123',
      organizationId: 'org_123',
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
