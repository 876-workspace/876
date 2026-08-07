import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applicationModule, planModule, app, feature, apiKey } = vi.hoisted(
  () => ({
    applicationModule: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    planModule: { deleteMany: vi.fn() },
    app: { findUnique: vi.fn() },
    feature: { findUnique: vi.fn() },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
  })
)

vi.mock('@/db/client', () => ({
  prisma: { applicationModule, planModule, app, feature, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function moduleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mod_7fJ3',
    appId: 'app_couriers',
    key: 'deliveries',
    name: 'Deliveries',
    description: 'Parcel delivery',
    featureId: 'ftr_1',
    status: 'active',
    position: 0,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    feature: { slug: 'couriers_deliveries' },
    ...overrides,
  }
}

const SERIALIZED = {
  object: 'application_module',
  id: 'mod_7fJ3',
  app_id: 'app_couriers',
  key: 'deliveries',
  name: 'Deliveries',
  description: 'Parcel delivery',
  feature_id: 'ftr_1',
  feature_slug: 'couriers_deliveries',
  status: 'active',
  position: 0,
  created_at: NOW,
  updated_at: NOW,
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  app.findUnique.mockResolvedValue({ id: 'app_couriers', appKind: 'product' })
  applicationModule.findMany.mockResolvedValue([moduleRow()])
  applicationModule.findUnique.mockResolvedValue(moduleRow())
  applicationModule.findFirst.mockResolvedValue(null)
  applicationModule.create.mockResolvedValue(moduleRow())
  applicationModule.update.mockResolvedValue(moduleRow())
  planModule.deleteMany.mockResolvedValue({ count: 0 })
  feature.findUnique.mockResolvedValue({
    id: 'ftr_1',
    appId: 'app_couriers',
    parentFeatureId: null,
    slug: 'couriers_deliveries',
  })
})

describe('GET /modules', () => {
  it('lists the active modules of an app', async () => {
    const response = await request(createApp())
      .get('/modules?appId=app_couriers')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED],
        has_more: false,
        url: '/modules',
        total_count: null,
      },
      error: null,
    })
    expect(applicationModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { appId: 'app_couriers', status: 'active' },
      })
    )
  })

  it('includes archived modules only when asked', async () => {
    await request(createApp())
      .get('/modules?appId=app_couriers&includeArchived=true')
      .set(AUTH)

    expect(applicationModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { appId: 'app_couriers' } })
    )
  })

  it('orders by position, then name, then id', async () => {
    // Two modules sharing a position must not swap places between requests.
    await request(createApp()).get('/modules?appId=app_couriers').set(AUTH)

    expect(applicationModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      })
    )
  })

  it('404s an unknown app', async () => {
    app.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/modules?appId=app_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('app/not-found')
  })

  it('requires the appId query parameter', async () => {
    const response = await request(createApp()).get('/modules').set(AUTH)

    expect(response.status).toBe(422)
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .get('/modules?appId=app_couriers')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })
})

describe('GET /modules/entitlements', () => {
  it('returns only modules granted by a live subscription', async () => {
    const response = await request(createApp())
      .get('/modules/entitlements?organizationId=org_1&appId=app_couriers')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.url).toBe('/modules/entitlements')

    const where = applicationModule.findMany.mock.calls[0]?.[0].where as Record<
      string,
      unknown
    >
    expect(where.status).toBe('active')
    expect(JSON.stringify(where)).toContain('trialing')
  })

  it('is not matched as a module id', async () => {
    await request(createApp())
      .get('/modules/entitlements?organizationId=org_1&appId=app_couriers')
      .set(AUTH)

    expect(applicationModule.findUnique).not.toHaveBeenCalled()
  })

  it('requires both the organization and the app', async () => {
    const response = await request(createApp())
      .get('/modules/entitlements?organizationId=org_1')
      .set(AUTH)

    expect(response.status).toBe(422)
  })
})

describe('POST /modules', () => {
  it('creates a module', async () => {
    const response = await request(createApp())
      .post('/modules')
      .set(AUTH)
      .send({ app_id: 'app_couriers', key: 'deliveries', name: 'Deliveries' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED, error: null })
  })

  it('refuses a module on a non-product app', async () => {
    // An internal or third-party app has nothing to sell an organization.
    app.findUnique.mockResolvedValue({ id: 'app_console', appKind: 'internal' })

    const response = await request(createApp())
      .post('/modules')
      .set(AUTH)
      .send({ app_id: 'app_console', key: 'widgets', name: 'Widgets' })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('module/app-invalid')
    expect(applicationModule.create).not.toHaveBeenCalled()
  })

  it('rejects a key that is not lowercase snake_case', async () => {
    const response = await request(createApp())
      .post('/modules')
      .set(AUTH)
      .send({ app_id: 'app_couriers', key: 'Deliveries!', name: 'Deliveries' })

    expect(response.status).toBe(422)
    expect(applicationModule.create).not.toHaveBeenCalled()
  })

  it('refuses a duplicate key within the app', async () => {
    applicationModule.findFirst.mockResolvedValue(moduleRow())

    const response = await request(createApp())
      .post('/modules')
      .set(AUTH)
      .send({ app_id: 'app_couriers', key: 'deliveries', name: 'Deliveries' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('module/duplicate-key')
  })

  it('refuses a rollout flag that does not exist', async () => {
    feature.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/modules')
      .set(AUTH)
      .send({
        app_id: 'app_couriers',
        key: 'deliveries',
        name: 'Deliveries',
        feature_id: 'ftr_gone',
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('module/feature-not-found')
  })

  it('refuses a rollout flag owned by another app', async () => {
    feature.findUnique.mockResolvedValue({
      id: 'ftr_1',
      appId: 'app_console',
      parentFeatureId: null,
      slug: 'console_widgets',
    })

    const response = await request(createApp())
      .post('/modules')
      .set(AUTH)
      .send({
        app_id: 'app_couriers',
        key: 'deliveries',
        name: 'Deliveries',
        feature_id: 'ftr_1',
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('module/feature-invalid')
  })

  it('refuses a child flag as a module rollout flag', async () => {
    // A child is already gated by its parent, so the module's availability would
    // depend on a second switch nobody looking at the module can see.
    feature.findUnique.mockResolvedValue({
      id: 'ftr_child',
      appId: 'app_couriers',
      parentFeatureId: 'ftr_parent',
      slug: 'couriers_deliveries_beta',
    })

    const response = await request(createApp())
      .post('/modules')
      .set(AUTH)
      .send({
        app_id: 'app_couriers',
        key: 'deliveries',
        name: 'Deliveries',
        feature_id: 'ftr_child',
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('module/feature-invalid')
  })

  it('refuses a rollout flag already linked to another module', async () => {
    // Sharing one flag would move two products with a single toggle.
    applicationModule.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(moduleRow({ id: 'mod_other' }))

    const response = await request(createApp())
      .post('/modules')
      .set(AUTH)
      .send({
        app_id: 'app_couriers',
        key: 'deliveries',
        name: 'Deliveries',
        feature_id: 'ftr_1',
      })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('module/feature-in-use')
  })
})

describe('PATCH /modules/:module_id', () => {
  it('applies the fields that were sent', async () => {
    await request(createApp())
      .patch('/modules/mod_7fJ3')
      .set(AUTH)
      .send({ name: '  Deliveries  ', position: 3 })

    expect(applicationModule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Deliveries', position: 3 }),
      })
    )
  })

  it('clears the rollout flag when feature_id is sent as null', async () => {
    await request(createApp())
      .patch('/modules/mod_7fJ3')
      .set(AUTH)
      .send({ feature_id: null })

    expect(applicationModule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ featureId: null }),
      })
    )
  })

  it('leaves the rollout flag alone when the key is absent', async () => {
    await request(createApp())
      .patch('/modules/mod_7fJ3')
      .set(AUTH)
      .send({ name: 'Deliveries' })

    const data = applicationModule.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data).not.toHaveProperty('featureId')
  })

  it('detaches the module from every plan when it is archived', async () => {
    // A plan still listing an archived module keeps granting an entitlement the
    // app no longer exposes.
    await request(createApp())
      .patch('/modules/mod_7fJ3')
      .set(AUTH)
      .send({ status: 'archived' })

    expect(planModule.deleteMany).toHaveBeenCalledWith({
      where: { moduleId: 'mod_7fJ3' },
    })
  })

  it('does not touch plans when the status is unchanged', async () => {
    await request(createApp())
      .patch('/modules/mod_7fJ3')
      .set(AUTH)
      .send({ name: 'Deliveries' })

    expect(planModule.deleteMany).not.toHaveBeenCalled()
  })

  it('404s an unknown module', async () => {
    applicationModule.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/modules/mod_gone')
      .set(AUTH)
      .send({ name: 'Deliveries' })

    expect(response.status).toBe(404)
    expect(applicationModule.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /modules/:module_id', () => {
  it('archives rather than deleting, and detaches it from plans', async () => {
    const response = await request(createApp())
      .delete('/modules/mod_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'application_module', id: 'mod_7fJ3', deleted: true },
      error: null,
    })
    expect(planModule.deleteMany).toHaveBeenCalledWith({
      where: { moduleId: 'mod_7fJ3' },
    })
    expect(applicationModule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'archived' }),
      })
    )
  })

  it('404s an unknown module', async () => {
    applicationModule.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .delete('/modules/mod_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(planModule.deleteMany).not.toHaveBeenCalled()
  })
})
