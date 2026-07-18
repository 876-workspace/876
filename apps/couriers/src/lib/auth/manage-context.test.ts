import type { PlatformRoutingMembership } from '@876/core/platform'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Tenant } from '@/lib/db'
import type { Signed876Session } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPlatformClient: vi.fn(),
  getRoutingMemberships: vi.fn(),
  retrieveByOrgId: vi.fn(),
  retrieveSubscriptionBySlug: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  }
})
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/couriers-app', () => ({
  COURIERS_APP_SLUG: '876-couriers',
}))
vi.mock('@/lib/service', () => ({
  service: {
    tenants: { retrieveByOrgId: mocks.retrieveByOrgId },
  },
}))

import { getManageContext } from './manage-context'

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '',
  'a'.repeat(10_000),
] as const

function createSession(
  overrides: Partial<Signed876Session> = {}
): Signed876Session {
  return {
    user: {
      id: 'user_kingston_123',
      email: 'althea@islandlogistics.test',
      orgId: null,
      firstName: 'Althea',
      lastName: 'Morgan',
    },
    accessToken: 'access_kingston_123',
    ...overrides,
  }
}

function createMembership(
  overrides: Partial<PlatformRoutingMembership> = {}
): PlatformRoutingMembership {
  return {
    id: 'membership_island_123',
    role: 'owner',
    status: 'active',
    organization: {
      id: 'organization_island_123',
      name: 'Island Logistics',
      slug: 'island-logistics',
      status: 'active',
    },
    ...overrides,
  }
}

function createTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant_island_123',
    orgId: 'organization_island_123',
    slug: 'island-couriers',
    name: 'Island Couriers',
    mailboxPrefix: 'KIN',
    status: 'ACTIVE',
    createdAt: 1_721_865_600,
    updatedAt: 1_721_952_000,
    ...overrides,
  }
}

describe('getManageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: {
        id: 'user_kingston_123',
        email: 'althea@islandlogistics.test',
        orgId: null,
      },
    })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPlatformClient.mockResolvedValue({
      auth: { getRoutingMemberships: mocks.getRoutingMemberships },
      orgs: {
        subscriptions: {
          retrieveBySlug: mocks.retrieveSubscriptionBySlug,
        },
      },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [
          {
            id: 'membership_island_123',
            role: 'owner',
            status: 'active',
            organization: {
              id: 'organization_island_123',
              name: 'Island Logistics',
              slug: 'island-logistics',
              status: 'active',
            },
          },
        ],
      },
      error: null,
    })
    mocks.retrieveByOrgId.mockResolvedValue(null)
    mocks.retrieveSubscriptionBySlug.mockResolvedValue({
      data: { status: 'active' },
      error: null,
    })
  })

  it('returns null for an unsigned session without loading the platform', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const result = await getManageContext()

    expect(result).toBeNull()
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
    expect(mocks.getRoutingMemberships).not.toHaveBeenCalled()
    expect(mocks.retrieveByOrgId).not.toHaveBeenCalled()
    expect(mocks.retrieveSubscriptionBySlug).not.toHaveBeenCalled()
  })

  it('returns null when memberships fail without loading courier tenants', async () => {
    mocks.getRoutingMemberships.mockResolvedValue({
      data: null,
      error: {
        code: 'provider/unavailable',
        message: 'Routing memberships are temporarily unavailable.',
      },
    })

    const result = await getManageContext()

    expect(result).toBeNull()
    expect(mocks.getPlatformClient).toHaveBeenCalledTimes(1)
    expect(mocks.getRoutingMemberships).toHaveBeenCalledTimes(1)
    expect(mocks.getRoutingMemberships).toHaveBeenCalledWith({
      userId: 'user_kingston_123',
      status: 'active',
    })
    expect(mocks.retrieveByOrgId).not.toHaveBeenCalled()
    expect(mocks.retrieveSubscriptionBySlug).not.toHaveBeenCalled()
  })

  it('resolves an exact active slug to the complete management context', async () => {
    const tenant = createTenant()
    mocks.retrieveByOrgId.mockResolvedValue(tenant)

    const result = await getManageContext('island-logistics')

    expect(result).toEqual({
      userId: 'user_kingston_123',
      orgId: 'organization_island_123',
      orgName: 'Island Logistics',
      orgSlug: 'island-logistics',
      organizations: [
        {
          id: 'organization_island_123',
          name: 'Island Logistics',
          slug: 'island-logistics',
          role: 'owner',
        },
      ],
      tenant,
      role: 'owner',
      accessStatus: 'active',
    })
    expect(mocks.getRoutingMemberships).toHaveBeenCalledTimes(1)
    expect(mocks.getRoutingMemberships).toHaveBeenCalledWith({
      userId: 'user_kingston_123',
      status: 'active',
    })
    expect(mocks.retrieveByOrgId).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByOrgId).toHaveBeenCalledWith(
      'organization_island_123'
    )
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'organization_island_123',
      '876-couriers'
    )
  })

  it.each(SECURITY_INPUTS)(
    'rejects a non-member slug %j without tenant or subscription calls',
    async (orgSlug) => {
      const result = await getManageContext(orgSlug)

      expect(result).toBeNull()
      expect(mocks.getRoutingMemberships).toHaveBeenCalledTimes(1)
      expect(mocks.getRoutingMemberships).toHaveBeenCalledWith({
        userId: 'user_kingston_123',
        status: 'active',
      })
      expect(mocks.retrieveByOrgId).not.toHaveBeenCalled()
      expect(mocks.retrieveSubscriptionBySlug).not.toHaveBeenCalled()
    }
  )

  it('returns null when the slug belongs to an inactive organization', async () => {
    const membership = createMembership({
      organization: {
        id: 'organization_archived_123',
        name: 'Archived Couriers',
        slug: 'archived-couriers',
        status: 'archived',
      },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [membership] },
      error: null,
    })

    const result = await getManageContext('archived-couriers')

    expect(result).toBeNull()
    expect(mocks.retrieveByOrgId).not.toHaveBeenCalled()
    expect(mocks.retrieveSubscriptionBySlug).not.toHaveBeenCalled()
  })

  it('returns null when the slug matches an inactive membership', async () => {
    const membership = createMembership({ status: 'inactive' })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [membership] },
      error: null,
    })

    const result = await getManageContext('island-logistics')

    expect(result).toBeNull()
    expect(mocks.retrieveByOrgId).not.toHaveBeenCalled()
    expect(mocks.retrieveSubscriptionBySlug).not.toHaveBeenCalled()
  })

  it('ignores the sealed organization id when an explicit slug is provided', async () => {
    const cookieMembership = createMembership({
      id: 'membership_cookie_123',
      role: 'admin',
      organization: {
        id: 'organization_cookie_123',
        name: 'Cookie Freight',
        slug: 'cookie-freight',
        status: 'active',
      },
    })
    const slugMembership = createMembership({
      id: 'membership_slug_123',
      role: 'member',
      organization: {
        id: 'organization_slug_123',
        name: 'Slug Express',
        slug: 'slug-express',
        status: 'active',
      },
    })
    const session = createSession({
      user: {
        id: 'user_kingston_123',
        email: 'althea@islandlogistics.test',
        orgId: 'organization_cookie_123',
      },
    })
    const tenant = createTenant({
      id: 'tenant_slug_123',
      orgId: 'organization_slug_123',
      slug: 'slug-couriers',
      name: 'Slug Couriers',
    })
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [cookieMembership, slugMembership] },
      error: null,
    })
    mocks.retrieveByOrgId.mockResolvedValue(tenant)

    const result = await getManageContext('slug-express')

    expect(result).toEqual({
      userId: 'user_kingston_123',
      orgId: 'organization_slug_123',
      orgName: 'Slug Express',
      orgSlug: 'slug-express',
      organizations: [
        {
          id: 'organization_cookie_123',
          name: 'Cookie Freight',
          slug: 'cookie-freight',
          role: 'admin',
        },
        {
          id: 'organization_slug_123',
          name: 'Slug Express',
          slug: 'slug-express',
          role: 'member',
        },
      ],
      tenant,
      role: 'member',
      accessStatus: 'active',
    })
    expect(mocks.retrieveByOrgId).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByOrgId).toHaveBeenCalledWith('organization_slug_123')
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'organization_slug_123',
      '876-couriers'
    )
  })

  it('uses a matching sealed organization id as the no-slug fast path', async () => {
    const session = createSession({
      user: {
        id: 'user_kingston_123',
        email: 'althea@islandlogistics.test',
        orgId: 'organization_island_123',
      },
    })
    const tenant = createTenant()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.retrieveByOrgId.mockResolvedValue(tenant)

    const result = await getManageContext()

    expect(result).toEqual({
      userId: 'user_kingston_123',
      orgId: 'organization_island_123',
      orgName: 'Island Logistics',
      orgSlug: 'island-logistics',
      organizations: [
        {
          id: 'organization_island_123',
          name: 'Island Logistics',
          slug: 'island-logistics',
          role: 'owner',
        },
      ],
      tenant,
      role: 'owner',
      accessStatus: 'active',
    })
    expect(mocks.retrieveByOrgId).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByOrgId).toHaveBeenCalledWith(
      'organization_island_123'
    )
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'organization_island_123',
      '876-couriers'
    )
  })

  it('returns null when the sealed organization id is outside memberships', async () => {
    const session = createSession({
      user: {
        id: 'user_kingston_123',
        email: 'althea@islandlogistics.test',
        orgId: 'organization_unavailable_123',
      },
    })
    mocks.getAuthSession.mockResolvedValue(session)

    const result = await getManageContext()

    expect(result).toBeNull()
    expect(mocks.retrieveByOrgId).not.toHaveBeenCalled()
    expect(mocks.retrieveSubscriptionBySlug).not.toHaveBeenCalled()
  })

  it('selects the first active organization with a tenant when no id is sealed', async () => {
    const firstMembership = createMembership({
      id: 'membership_portland_123',
      role: 'admin',
      organization: {
        id: 'organization_portland_123',
        name: 'Portland Freight',
        slug: 'portland-freight',
        status: 'active',
      },
    })
    const secondMembership = createMembership({
      id: 'membership_montego_123',
      role: 'owner',
      organization: {
        id: 'organization_montego_123',
        name: 'Montego Express',
        slug: 'montego-express',
        status: 'active',
      },
    })
    const tenant = createTenant({
      id: 'tenant_montego_123',
      orgId: 'organization_montego_123',
      slug: 'montego-couriers',
      name: 'Montego Couriers',
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [firstMembership, secondMembership] },
      error: null,
    })
    mocks.retrieveByOrgId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(tenant)

    const result = await getManageContext()

    expect(result).toEqual({
      userId: 'user_kingston_123',
      orgId: 'organization_montego_123',
      orgName: 'Montego Express',
      orgSlug: 'montego-express',
      organizations: [
        {
          id: 'organization_portland_123',
          name: 'Portland Freight',
          slug: 'portland-freight',
          role: 'admin',
        },
        {
          id: 'organization_montego_123',
          name: 'Montego Express',
          slug: 'montego-express',
          role: 'owner',
        },
      ],
      tenant,
      role: 'owner',
      accessStatus: 'active',
    })
    expect(mocks.retrieveByOrgId).toHaveBeenCalledTimes(2)
    expect(mocks.retrieveByOrgId).toHaveBeenNthCalledWith(
      1,
      'organization_portland_123'
    )
    expect(mocks.retrieveByOrgId).toHaveBeenNthCalledWith(
      2,
      'organization_montego_123'
    )
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'organization_montego_123',
      '876-couriers'
    )
  })

  it('falls back to the first active organization when none has a tenant', async () => {
    const firstMembership = createMembership({
      id: 'membership_portland_123',
      role: 'admin',
      organization: {
        id: 'organization_portland_123',
        name: 'Portland Freight',
        slug: 'portland-freight',
        status: 'active',
      },
    })
    const secondMembership = createMembership({
      id: 'membership_montego_123',
      role: 'member',
      organization: {
        id: 'organization_montego_123',
        name: 'Montego Express',
        slug: 'montego-express',
        status: 'active',
      },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [firstMembership, secondMembership] },
      error: null,
    })

    const result = await getManageContext()

    expect(result).toEqual({
      userId: 'user_kingston_123',
      orgId: 'organization_portland_123',
      orgName: 'Portland Freight',
      orgSlug: 'portland-freight',
      organizations: [
        {
          id: 'organization_portland_123',
          name: 'Portland Freight',
          slug: 'portland-freight',
          role: 'admin',
        },
        {
          id: 'organization_montego_123',
          name: 'Montego Express',
          slug: 'montego-express',
          role: 'member',
        },
      ],
      tenant: null,
      role: 'admin',
      accessStatus: 'active',
    })
    expect(mocks.retrieveByOrgId).toHaveBeenCalledTimes(2)
    expect(mocks.retrieveByOrgId).toHaveBeenNthCalledWith(
      1,
      'organization_portland_123'
    )
    expect(mocks.retrieveByOrgId).toHaveBeenNthCalledWith(
      2,
      'organization_montego_123'
    )
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
      'organization_portland_123',
      '876-couriers'
    )
  })

  it('returns null when no active organization is available', async () => {
    const membership = createMembership({
      organization: {
        id: 'organization_archived_123',
        name: 'Archived Couriers',
        slug: 'archived-couriers',
        status: 'archived',
      },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [membership] },
      error: null,
    })

    const result = await getManageContext()

    expect(result).toBeNull()
    expect(mocks.retrieveByOrgId).not.toHaveBeenCalled()
    expect(mocks.retrieveSubscriptionBySlug).not.toHaveBeenCalled()
  })

  it('maps only active memberships in active organizations', async () => {
    const activeMembership = createMembership()
    const inactiveMembership = createMembership({
      id: 'membership_inactive_123',
      status: 'inactive',
      organization: {
        id: 'organization_inactive_membership_123',
        name: 'Inactive Membership Logistics',
        slug: 'inactive-membership-logistics',
        status: 'active',
      },
    })
    const archivedOrgMembership = createMembership({
      id: 'membership_archived_org_123',
      role: 'admin',
      organization: {
        id: 'organization_archived_123',
        name: 'Archived Logistics',
        slug: 'archived-logistics',
        status: 'archived',
      },
    })
    const session = createSession({
      user: {
        id: 'user_kingston_123',
        email: 'althea@islandlogistics.test',
        orgId: 'organization_island_123',
      },
    })
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [inactiveMembership, archivedOrgMembership, activeMembership],
      },
      error: null,
    })

    const result = await getManageContext()

    expect(result).toEqual({
      userId: 'user_kingston_123',
      orgId: 'organization_island_123',
      orgName: 'Island Logistics',
      orgSlug: 'island-logistics',
      organizations: [
        {
          id: 'organization_island_123',
          name: 'Island Logistics',
          slug: 'island-logistics',
          role: 'owner',
        },
      ],
      tenant: null,
      role: 'owner',
      accessStatus: 'active',
    })
    expect(mocks.retrieveByOrgId).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByOrgId).toHaveBeenCalledWith(
      'organization_island_123'
    )
  })

  it.each([
    ['subscription error', { data: null, error: { message: 'Unavailable.' } }],
    ['missing status', { data: {}, error: null }],
    ['active status', { data: { status: 'active' }, error: null }],
    ['blocked status', { data: { status: 'blocked' }, error: null }],
  ] as const)(
    'maps %s to the exact access status',
    async (_case, subscriptionResult) => {
      const expectedStatus =
        subscriptionResult.data && 'status' in subscriptionResult.data
          ? subscriptionResult.data.status
          : 'none'
      mocks.retrieveSubscriptionBySlug.mockResolvedValue(subscriptionResult)

      const result = await getManageContext('island-logistics')

      expect(result).toEqual({
        userId: 'user_kingston_123',
        orgId: 'organization_island_123',
        orgName: 'Island Logistics',
        orgSlug: 'island-logistics',
        organizations: [
          {
            id: 'organization_island_123',
            name: 'Island Logistics',
            slug: 'island-logistics',
            role: 'owner',
          },
        ],
        tenant: null,
        role: 'owner',
        accessStatus: expectedStatus,
      })
      expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledTimes(1)
      expect(mocks.retrieveSubscriptionBySlug).toHaveBeenCalledWith(
        'organization_island_123',
        '876-couriers'
      )
    }
  )
})
