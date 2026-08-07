import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signProviderJwt } from '@/platform/jwt'

const NOW = 1785000000

function organizationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org_4qR8',
    workosOrganizationId: 'org_workos_1',
    name: 'Reyes Logistics',
    shortName: null,
    doingBusinessAs: null,
    slug: 'reyes-logistics',
    status: 'active',
    logoUrl: null,
    logoFileId: null,
    industry: null,
    businessType: null,
    registrationNumber: null,
    trn: null,
    nisNumber: null,
    gctNumber: null,
    taxId: null,
    incorporationDate: null,
    primaryPhone: null,
    primaryEmail: null,
    fax: null,
    websiteUrl: null,
    supportUrl: null,
    primaryContactUserId: null,
    timezone: null,
    language: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    regionId: null,
    countryCode: null,
    currencyCode: null,
    enrollmentCompletedAt: null,
    metadata: null,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function membershipRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem_01',
    organizationId: 'org_4qR8',
    userId: 'user_2kL9',
    workosMembershipId: 'om_1',
    role: 'owner',
    roleId: 'role_owner',
    status: 'active',
    deletedAt: null,
    deletedBy: null,
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW),
    user: {
      firstName: 'Alejandra',
      lastName: 'Reyes',
      email: 'alejandra@example.com',
      avatar: null,
    },
    ...overrides,
  }
}

const {
  organization,
  membership,
  organizationRole,
  user,
  app,
  subscription,
  subscriptionItem,
  orgInvite,
  appAssignment,
  apiKey,
} = vi.hoisted(() => ({
  organization: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  membership: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  organizationRole: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  app: { findUnique: vi.fn(), findFirst: vi.fn() },
  subscription: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  subscriptionItem: {
    findFirst: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  orgInvite: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  appAssignment: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    organization,
    membership,
    organizationRole,
    user,
    app,
    subscription,
    subscriptionItem,
    orgInvite,
    appAssignment,
    apiKey,
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)({})
        : Promise.all(arg as unknown[])
    ),
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

// Only the two collaborators these routes reach are stubbed. Replacing
// `@/services/provisioning` wholesale also blanks its exported constants, which
// `provisioning-catalog` reads at module scope.
vi.mock('@/services/provisioning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/provisioning')>()),
  provisionOrganization: vi
    .fn()
    .mockResolvedValue({ owner: { id: 'role_owner' } }),
  linkMembershipRole: vi.fn().mockResolvedValue(undefined),
  assignMemberApps: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/identity-sync', () => ({
  ensureProviderMembership: vi.fn().mockResolvedValue('om_new'),
  deleteProviderOrganization: vi.fn().mockResolvedValue(true),
  deleteProviderMembership: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/services/finance-provisioning', () => ({
  reconcileFinanceConnections: vi
    .fn()
    .mockResolvedValue({ examined: 0, changed: 0, nextCursor: null }),
}))

vi.mock('@/providers/workos/adapter', () => ({
  getAuthProvider: vi.fn(() => ({
    createOrganization: vi.fn().mockResolvedValue({ id: 'org_workos_1' }),
    createOrganizationMembership: vi.fn().mockResolvedValue({ id: 'om_1' }),
    deleteOrganization: vi.fn().mockResolvedValue(undefined),
    deleteOrganizationMembership: vi.fn().mockResolvedValue(undefined),
  })),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const ADMIN = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function accessToken(overrides: Record<string, unknown> = {}) {
  return signProviderJwt({
    sub: 'user_2kL9',
    aud: 'app_4qR8',
    token_use: 'access',
    realm: 'enterprise',
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  })
}

async function sessionHeaders(overrides: Record<string, unknown> = {}) {
  return {
    'X-876-API-Key': APP_KEY,
    Authorization: `Bearer ${await accessToken(overrides)}`,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))

  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})

  organization.findFirst.mockResolvedValue(organizationRow())
  organization.findUnique.mockResolvedValue(organizationRow())
  organization.findMany.mockResolvedValue([organizationRow()])
  organization.create.mockResolvedValue(organizationRow())
  organization.update.mockResolvedValue(organizationRow())

  membership.findFirst.mockResolvedValue(membershipRow())
  membership.findUnique.mockResolvedValue(membershipRow())
  membership.findMany.mockResolvedValue([membershipRow()])
  membership.count.mockResolvedValue(0)

  organizationRole.findMany.mockResolvedValue([])
  organizationRole.findFirst.mockResolvedValue({
    id: 'role_owner',
    organizationId: 'org_4qR8',
    name: 'owner',
    permissions: ['org:update', 'members:read', 'members:manage'],
    isSystem: true,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
  })

  user.findUnique.mockResolvedValue({
    id: 'user_2kL9',
    email: 'alejandra@example.com',
    workosUserId: 'user_workos_1',
  })
  app.findUnique.mockResolvedValue({ id: 'app_1', slug: '876-enterprise' })
  app.findFirst.mockResolvedValue({ id: 'app_1', slug: '876-enterprise' })

  subscription.findMany.mockResolvedValue([])
  subscription.findFirst.mockResolvedValue(null)
  orgInvite.findMany.mockResolvedValue([])
  orgInvite.findFirst.mockResolvedValue(null)
  appAssignment.findMany.mockResolvedValue([])
})

describe('GET /organizations', () => {
  it('returns the list object with the resource url', async () => {
    const response = await request(createApp()).get('/organizations').set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.url).toBe('/organizations')
    expect(response.body.data.has_more).toBe(false)
    expect(response.body.data.data[0]).toMatchObject({
      object: 'organization',
      id: 'org_4qR8',
      slug: 'reyes-logistics',
      status: 'active',
    })
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .get('/organizations')
      .set('X-876-API-Key', APP_KEY)

    // `requireAdmin` rejects a caller carrying no internal key and no session
    // as `auth/no-session`; a *session* holder who is not internal gets
    // `auth/forbidden` instead. Both are 401/403 with nothing about the key.
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })

  it('rejects a request with no app API key', async () => {
    const response = await request(createApp()).get('/organizations')

    expect(response.status).toBe(401)
  })
})

describe('GET /organizations/:id', () => {
  it('returns the organization', async () => {
    const response = await request(createApp())
      .get('/organizations/org_4qR8')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('org_4qR8')
    expect(response.body.data.object).toBe('organization')
  })

  it('404s with the exact code when absent', async () => {
    organization.findFirst.mockResolvedValue(null)
    organization.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/organizations/org_missing')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('organization/not-found')
    expect(response.body.data).toBeNull()
  })

  it('does not leak the server-only http status into the body', async () => {
    organization.findFirst.mockResolvedValue(null)
    organization.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/organizations/org_missing')
      .set(ADMIN)

    expect(response.body.error).not.toHaveProperty('httpStatus')
    expect(response.body.error).not.toHaveProperty('http_status')
  })
})

describe('GET /organizations/by-slug/:slug', () => {
  it('is not shadowed by the /:organization_id route', async () => {
    const response = await request(createApp())
      .get('/organizations/by-slug/reyes-logistics')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body.data.slug).toBe('reyes-logistics')
  })
})

describe('GET /organizations/search', () => {
  it('is not shadowed by the /:organization_id route', async () => {
    const response = await request(createApp())
      .get('/organizations/search?query=reyes')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
  })

  it('rejects a blank query', async () => {
    const response = await request(createApp())
      .get('/organizations/search?query=')
      .set(ADMIN)

    expect(response.status).toBe(422)
  })
})

describe('POST /organizations', () => {
  it('rejects a duplicate slug with the exact code', async () => {
    const response = await request(createApp())
      .post('/organizations')
      .set(ADMIN)
      .send({ name: 'Reyes Logistics', slug: 'reyes-logistics' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('organization/duplicate-slug')
    expect(organization.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown field, since the body is strict', async () => {
    organization.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/organizations')
      .set(ADMIN)
      .send({ name: 'Reyes Logistics', not_a_field: true })

    expect(response.status).toBe(422)
    expect(organization.create).not.toHaveBeenCalled()
  })
})

describe('GET /organizations/permissions/catalog', () => {
  it('serves the static catalog without touching the database', async () => {
    const response = await request(createApp())
      .get('/organizations/permissions/catalog')
      .set(await sessionHeaders())

    expect(response.status).toBe(200)
    expect(organization.findFirst).not.toHaveBeenCalled()
  })
})

describe('GET /organizations/:id/members/me', () => {
  it('returns the caller membership with its effective permissions', async () => {
    const response = await request(createApp())
      .get('/organizations/org_4qR8/members/me')
      .set(await sessionHeaders())

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      role: 'owner',
      status: 'active',
    })
  })

  it('401s without a session', async () => {
    const response = await request(createApp())
      .get('/organizations/org_4qR8/members/me')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })

  it('403s when the caller is not an active member', async () => {
    membership.findFirst.mockResolvedValue(
      membershipRow({ status: 'invited' }) as never
    )

    const response = await request(createApp())
      .get('/organizations/org_4qR8/members/me')
      .set(await sessionHeaders())

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/forbidden')
  })

  it('403s for an organization the caller does not belong to', async () => {
    membership.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/organizations/org_someone_else/members/me')
      .set(await sessionHeaders())

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/forbidden')
  })
})

describe('DELETE /organizations/:orgId/members/:membershipId', () => {
  it('refuses self-removal with the exact code', async () => {
    membership.findUnique.mockResolvedValue(
      membershipRow({ id: 'mem_01', userId: 'user_2kL9' }) as never
    )

    const response = await request(createApp())
      .delete('/organizations/org_4qR8/members/mem_01')
      .set(await sessionHeaders())

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('membership/self-removal-forbidden')
    expect(membership.update).not.toHaveBeenCalled()
  })

  it('refuses to remove the last owner', async () => {
    membership.findUnique.mockResolvedValue(
      membershipRow({
        id: 'mem_02',
        userId: 'user_other',
        role: 'owner',
      }) as never
    )
    // The caller is an owner; no other active owner exists.
    membership.findFirst
      .mockResolvedValueOnce(membershipRow() as never) // permission check
      .mockResolvedValueOnce(membershipRow() as never) // caller is owner
      .mockResolvedValueOnce(null) // no other active owner

    const response = await request(createApp())
      .delete('/organizations/org_4qR8/members/mem_02')
      .set(await sessionHeaders())

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('role/last-owner')
    expect(membership.update).not.toHaveBeenCalled()
  })

  it('404s for a membership belonging to another organization', async () => {
    membership.findUnique.mockResolvedValue(
      membershipRow({ id: 'mem_03', organizationId: 'org_other' }) as never
    )

    const response = await request(createApp())
      .delete('/organizations/org_4qR8/members/mem_03')
      .set(await sessionHeaders())

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('membership/not-found')
    expect(membership.update).not.toHaveBeenCalled()
  })
})

describe('organization structure', () => {
  it('403s a location read for a non-member', async () => {
    membership.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/organizations/org_4qR8/locations')
      .set(await sessionHeaders())

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/forbidden')
  })

  it('401s a location read with no session', async () => {
    const response = await request(createApp())
      .get('/organizations/org_4qR8/locations')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })
})

describe('the published OpenAPI document', () => {
  it('documents every organization router under one prefix', async () => {
    const response = await request(createApp()).get('/openapi.json')

    expect(response.status).toBe(200)
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/organizations',
        '/organizations/{organization_id}',
        '/organizations/by-slug/{slug}',
        '/organizations/search',
        '/organizations/app-access/batch',
        '/organizations/permissions/catalog',
        '/organizations/{org_id}/members/me',
        '/organizations/{org_id}/locations',
        '/organizations/{org_id}/roles',
      ])
    )
  })

  it('preserves the Python operationIds', async () => {
    const response = await request(createApp()).get('/openapi.json')

    expect(response.body.paths['/organizations'].get.operationId).toBe(
      'organizations-list_organizations'
    )
    expect(
      response.body.paths['/organizations/app-access/batch'].get.operationId
    ).toBe('organizations-batch_list_subscriptions')
  })
})
