import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signProviderJwt } from '@/platform/jwt'

const NOW = 1785000000

function featureRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'feat_7fJ3',
    provider: 'posthog',
    providerFeatureId: 'ph_123',
    providerEnvironmentId: 'env_1',
    slug: 'platform_test',
    name: 'Test Feature',
    description: null,
    tags: [],
    enabled: true,
    defaultValue: false,
    valueType: null,
    value: null,
    serverSideOnly: true,
    archivedAt: null,
    parentFeatureId: null,
    providerMetadata: null,
    consumerDefaultEnabled: false,
    scope: 'global',
    appId: null,
    syncedAt: BigInt(NOW),
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function userFeatureRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'uf_001',
    userId: 'user_2kL9',
    featureId: 'feat_7fJ3',
    status: 'enabled',
    note: null,
    syncedAt: BigInt(NOW),
    createdAt: BigInt(NOW - 50),
    updatedAt: BigInt(NOW),
    feature: { slug: 'platform_test' },
    ...overrides,
  }
}

function orgFeatureRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'of_001',
    organizationId: 'org_4qR8',
    featureId: 'feat_7fJ3',
    status: 'enabled',
    note: null,
    syncedAt: BigInt(NOW),
    createdAt: BigInt(NOW - 50),
    updatedAt: BigInt(NOW),
    feature: { slug: 'platform_test' },
    ...overrides,
  }
}

const SERIALIZED_FEATURE = {
  object: 'feature',
  id: 'feat_7fJ3',
  provider: 'posthog',
  provider_feature_id: 'ph_123',
  provider_environment_id: 'env_1',
  slug: 'platform_test',
  name: 'Test Feature',
  description: null,
  tags: [],
  enabled: true,
  default_value: false,
  value_type: null,
  value: null,
  server_side_only: true,
  archived_at: null,
  parent_feature_id: null,
  provider_metadata: null,
  consumer_default_enabled: false,
  scope: 'global',
  app_id: null,
  synced_at: NOW,
  created_at: NOW - 100,
  updated_at: NOW,
}

const SERIALIZED_USER_FEATURE = {
  object: 'user_feature',
  id: 'uf_001',
  user_id: 'user_2kL9',
  feature_id: 'feat_7fJ3',
  slug: 'platform_test',
  status: 'enabled',
  note: null,
  synced_at: NOW,
  created_at: NOW - 50,
  updated_at: NOW,
}

const SERIALIZED_ORG_FEATURE = {
  object: 'org_feature',
  id: 'of_001',
  organization_id: 'org_4qR8',
  feature_id: 'feat_7fJ3',
  slug: 'platform_test',
  status: 'enabled',
  note: null,
  synced_at: NOW,
  created_at: NOW - 50,
  updated_at: NOW,
}

const {
  feature,
  userFeature,
  orgFeature,
  app,
  user,
  organization,
  membership,
  apiKey,
  applicationModule,
} = vi.hoisted(() => ({
  feature: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  userFeature: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  orgFeature: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  app: { findUnique: vi.fn(), findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
  organization: { findUnique: vi.fn() },
  membership: { findFirst: vi.fn(), findUnique: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  applicationModule: { findMany: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    feature,
    userFeature,
    orgFeature,
    app,
    user,
    organization,
    membership,
    apiKey,
    applicationModule,
    // Prisma helper for $transaction not needed
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb({})),
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/providers/posthog/client', () => ({
  getPostHogClient: vi.fn(() => ({
    createFeature: vi.fn().mockResolvedValue({
      id: 'ph_123',
      key: 'platform_test',
      name: 'Test Feature',
      active: true,
    }),
    updateFeature: vi.fn().mockResolvedValue({
      id: 'ph_123',
      key: 'platform_test',
      name: 'Test Feature',
      active: true,
    }),
    deleteFeature: vi.fn().mockResolvedValue(undefined),
  })),
  PostHogClient: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }

async function accessToken(overrides: Record<string, unknown> = {}) {
  return signProviderJwt({
    sub: 'user_2kL9',
    aud: 'app_4qR8',
    token_use: 'access',
    realm: 'consumer',
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  })
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

  feature.findUnique.mockResolvedValue(featureRow() as never)
  feature.findMany.mockResolvedValue([featureRow()] as never)
  feature.create.mockResolvedValue(featureRow() as never)
  feature.update.mockResolvedValue(featureRow() as never)
  feature.delete.mockResolvedValue(featureRow() as never)

  app.findUnique.mockResolvedValue({
    id: 'app_1',
    slug: '876-app',
    name: '876',
    status: 'active',
  })
  app.findFirst.mockResolvedValue(null)

  user.findUnique.mockResolvedValue({ id: 'user_2kL9' } as never)
  organization.findUnique.mockResolvedValue({ id: 'org_4qR8' } as never)

  membership.findFirst.mockResolvedValue({
    id: 'mem_1',
    status: 'active',
  } as never)

  userFeature.findUnique.mockResolvedValue(userFeatureRow() as never)
  userFeature.findMany.mockResolvedValue([userFeatureRow()] as never)
  userFeature.upsert.mockResolvedValue(userFeatureRow() as never)
  userFeature.delete.mockResolvedValue(userFeatureRow() as never)

  orgFeature.findUnique.mockResolvedValue(orgFeatureRow() as never)
  orgFeature.findMany.mockResolvedValue([orgFeatureRow()] as never)
  orgFeature.upsert.mockResolvedValue(orgFeatureRow() as never)
  orgFeature.delete.mockResolvedValue(orgFeatureRow() as never)

  applicationModule.findMany.mockResolvedValue([])

  // For enriched grants, orgFeature/findMany is called with include, same mock above works
  // Override to return enriched shape for grants tests specifically when needed
})

describe('GET /features', () => {
  it('returns a list object of features', async () => {
    const response = await request(createApp()).get('/features').set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_FEATURE],
        has_more: false,
        url: '/features',
        total_count: null,
      },
      error: null,
    })
  })

  it('uses search path when search query is present', async () => {
    feature.findMany.mockResolvedValue([featureRow()] as never)
    const response = await request(createApp())
      .get('/features?search=platform')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([SERIALIZED_FEATURE])
    expect(response.body.data.has_more).toBe(false)
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .get('/features')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
    expect(feature.findMany).not.toHaveBeenCalled()
  })

  it('rejects an invalid limit', async () => {
    const response = await request(createApp())
      .get('/features?limit=999')
      .set(AUTH)

    expect(response.status).toBe(422)
  })
})

describe('POST /features', () => {
  it('creates a feature', async () => {
    const response = await request(createApp())
      .post('/features')
      .set(AUTH)
      .send({ name: 'New Feature', slug: 'platform_new' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_FEATURE, error: null })
  })

  it('rejects missing name', async () => {
    const response = await request(createApp())
      .post('/features')
      .set(AUTH)
      .send({})

    expect(response.status).toBe(422)
    expect(feature.create).not.toHaveBeenCalled()
  })

  it('rejects unknown field', async () => {
    const response = await request(createApp())
      .post('/features')
      .set(AUTH)
      .send({ name: 'X', unknown: true })

    expect(response.status).toBe(422)
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .post('/features')
      .set('X-876-API-Key', APP_KEY)
      .send({ name: 'X' })

    expect(response.status).toBe(401)
  })
})

describe('GET /features/evaluate', () => {
  it('evaluates features', async () => {
    const response = await request(createApp())
      .get('/features/evaluate')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.url).toBe('/features/evaluate')
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .get('/features/evaluate')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })
})

describe('GET /features/evaluate/me', () => {
  it('evaluates for current user with membership', async () => {
    const token = await accessToken({ sub: 'user_2kL9' })
    const response = await request(createApp())
      .get('/features/evaluate/me')
      .set('X-876-API-Key', APP_KEY)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
  })

  it('401s without session', async () => {
    const response = await request(createApp())
      .get('/features/evaluate/me')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })

  it('403s when organization membership missing', async () => {
    membership.findFirst.mockResolvedValue(null)
    const token = await accessToken({ sub: 'user_2kL9' })
    const response = await request(createApp())
      .get('/features/evaluate/me?organizationId=org_4qR8')
      .set('X-876-API-Key', APP_KEY)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(403)
  })

  it('is not shadowed by :feature_id route', async () => {
    const token = await accessToken()
    const response = await request(createApp())
      .get('/features/evaluate/me')
      .set('X-876-API-Key', APP_KEY)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
  })
})

describe('GET /features/:feature_id', () => {
  it('returns the feature', async () => {
    const response = await request(createApp())
      .get('/features/feat_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_FEATURE, error: null })
  })

  it('404s unknown feature', async () => {
    feature.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .get('/features/feat_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('feature/not-found')
  })

  it('is not shadowed by evaluate', async () => {
    const response = await request(createApp())
      .get('/features/evaluate')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(feature.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'evaluate' } })
    )
  })
})

describe('GET /features/:feature_id/grants', () => {
  it('returns org and user grant lists', async () => {
    // Mock enriched grants: orgFeature and userFeature with includes
    orgFeature.findMany.mockResolvedValue([
      {
        id: 'of_001',
        organizationId: 'org_4qR8',
        featureId: 'feat_7fJ3',
        status: 'enabled',
        note: null,
        createdAt: BigInt(NOW - 50),
        updatedAt: BigInt(NOW),
        organization: { name: 'Org One', slug: 'org-one', logoUrl: null },
        feature: { slug: 'platform_test' },
      },
    ] as never)
    userFeature.findMany.mockResolvedValue([
      {
        id: 'uf_001',
        userId: 'user_2kL9',
        featureId: 'feat_7fJ3',
        status: 'enabled',
        note: null,
        createdAt: BigInt(NOW - 50),
        updatedAt: BigInt(NOW),
        user: {
          email: 'a@876.test',
          firstName: 'Ada',
          lastName: 'Lovelace',
          username: null,
          avatar: null,
        },
        feature: { slug: 'platform_test' },
      },
    ] as never)

    const response = await request(createApp())
      .get('/features/feat_7fJ3/grants')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('feature_grants')
    expect(response.body.data.feature_id).toBe('feat_7fJ3')
    expect(response.body.data.organizations.data[0].organization_slug).toBe(
      'org-one'
    )
    expect(response.body.data.users.data[0].user_email).toBe('a@876.test')
  })

  it('404s unknown feature', async () => {
    feature.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .get('/features/feat_gone/grants')
      .set(AUTH)

    expect(response.status).toBe(404)
  })
})

describe('PATCH /features/:feature_id', () => {
  it('updates a feature', async () => {
    const response = await request(createApp())
      .patch('/features/feat_7fJ3')
      .set(AUTH)
      .send({ description: 'Updated' })

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('feat_7fJ3')
  })

  it('rejects unknown field', async () => {
    const response = await request(createApp())
      .patch('/features/feat_7fJ3')
      .set(AUTH)
      .send({ unknown: true })

    expect(response.status).toBe(422)
  })

  it('404s unknown feature', async () => {
    feature.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .patch('/features/feat_gone')
      .set(AUTH)
      .send({ description: 'x' })

    expect(response.status).toBe(404)
  })
})

describe('DELETE /features/:feature_id', () => {
  it('deletes a feature', async () => {
    const response = await request(createApp())
      .delete('/features/feat_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'feature',
      id: 'feat_7fJ3',
      deleted: true,
    })
  })

  it('404s unknown feature', async () => {
    feature.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .delete('/features/feat_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
  })
})

describe('GET /features/users/:user_id/features', () => {
  it('lists user features', async () => {
    const response = await request(createApp())
      .get('/features/users/user_2kL9/features')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.data[0]).toEqual(SERIALIZED_USER_FEATURE)
    expect(response.body.data.url).toBe('/features/users/user_2kL9/features')
  })

  it('404s unknown user', async () => {
    user.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .get('/features/users/user_gone/features')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('feature/user-not-found')
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .get('/features/users/user_2kL9/features')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })
})

describe('POST /features/users/:user_id/features', () => {
  it('grants a feature to user', async () => {
    const response = await request(createApp())
      .post('/features/users/user_2kL9/features')
      .set(AUTH)
      .send({ feature_id: 'feat_7fJ3' })

    expect(response.status).toBe(201)
    expect(response.body.data).toEqual(SERIALIZED_USER_FEATURE)
  })

  it('rejects missing feature_id', async () => {
    const response = await request(createApp())
      .post('/features/users/user_2kL9/features')
      .set(AUTH)
      .send({})

    expect(response.status).toBe(422)
  })

  it('400s scope mismatch for enterprise feature', async () => {
    feature.findUnique.mockResolvedValue(
      featureRow({ scope: 'enterprise' }) as never
    )
    const response = await request(createApp())
      .post('/features/users/user_2kL9/features')
      .set(AUTH)
      .send({ feature_id: 'feat_7fJ3' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('feature/scope-mismatch')
  })
})

describe('PATCH /features/users/:user_id/features/:feature_id', () => {
  it('updates user feature grant', async () => {
    userFeature.findUnique.mockResolvedValue(userFeatureRow() as never)
    const response = await request(createApp())
      .patch('/features/users/user_2kL9/features/feat_7fJ3')
      .set(AUTH)
      .send({ enabled: false })

    expect(response.status).toBe(200)
  })

  it('404s missing grant', async () => {
    userFeature.findUnique.mockResolvedValue(null)
    // getUserFeature via findUnique for composite key may use findUnique with where userId_featureId
    // Our mock for findUnique is shared; null will trigger 404
    const response = await request(createApp())
      .patch('/features/users/user_2kL9/features/feat_gone')
      .set(AUTH)
      .send({ enabled: false })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('user-feature/not-found')
  })
})

describe('DELETE /features/users/:user_id/features/:feature_id', () => {
  it('revokes user feature', async () => {
    const response = await request(createApp())
      .delete('/features/users/user_2kL9/features/feat_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'user_feature',
      id: 'uf_001',
      deleted: true,
    })
  })

  it('404s missing grant', async () => {
    userFeature.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .delete('/features/users/user_2kL9/features/feat_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
  })
})

describe('GET /features/organizations/:organization_id/features', () => {
  it('lists org features', async () => {
    const response = await request(createApp())
      .get('/features/organizations/org_4qR8/features')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.data[0]).toEqual(SERIALIZED_ORG_FEATURE)
  })

  it('404s unknown organization', async () => {
    organization.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .get('/features/organizations/org_gone/features')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('feature/organization-not-found')
  })
})

describe('POST /features/organizations/:organization_id/features', () => {
  it('grants feature to org', async () => {
    const response = await request(createApp())
      .post('/features/organizations/org_4qR8/features')
      .set(AUTH)
      .send({ feature_id: 'feat_7fJ3' })

    expect(response.status).toBe(201)
    expect(response.body.data).toEqual(SERIALIZED_ORG_FEATURE)
  })

  it('400s scope mismatch for consumer feature', async () => {
    feature.findUnique.mockResolvedValue(
      featureRow({ scope: 'consumer' }) as never
    )
    const response = await request(createApp())
      .post('/features/organizations/org_4qR8/features')
      .set(AUTH)
      .send({ feature_id: 'feat_7fJ3' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('feature/scope-mismatch')
  })
})

describe('PATCH /features/organizations/:organization_id/features/:feature_id', () => {
  it('updates org feature grant', async () => {
    orgFeature.findUnique.mockResolvedValue(orgFeatureRow() as never)
    const response = await request(createApp())
      .patch('/features/organizations/org_4qR8/features/feat_7fJ3')
      .set(AUTH)
      .send({ enabled: false })

    expect(response.status).toBe(200)
  })

  it('404s missing grant', async () => {
    orgFeature.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .patch('/features/organizations/org_4qR8/features/feat_gone')
      .set(AUTH)
      .send({ enabled: false })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('org-feature/not-found')
  })
})

describe('DELETE /features/organizations/:organization_id/features/:feature_id', () => {
  it('revokes org feature', async () => {
    const response = await request(createApp())
      .delete('/features/organizations/org_4qR8/features/feat_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'org_feature',
      id: 'of_001',
      deleted: true,
    })
  })

  it('404s missing grant', async () => {
    orgFeature.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .delete('/features/organizations/org_4qR8/features/feat_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
  })
})
