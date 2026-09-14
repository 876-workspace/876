import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_789_400_000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function categoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pcat_electronics',
    tenantId: 'ten_reyes',
    provisioningKey: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Consumer electronics and accessories.',
    icon: null,
    sortOrder: 40,
    isActive: true,
    createdAt: NOW - 100,
    updatedAt: NOW - 100,
    deletedAt: null,
    ...overrides,
  }
}

const { packageCategory } = vi.hoisted(() => ({
  packageCategory: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/db/client', () => ({
  prisma: { packageCategory },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/application')
const { resetSettingsForTest } = await import('@/config')
const { reconcileProvisionedPackageCategories } =
  await import('../package-categories.service')

const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  DIRECT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  API_876_KEY: APP_KEY,
  API_INTERNAL_KEY: 'test-internal-key',
  SENTRY_DSN: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))
  packageCategory.findMany.mockResolvedValue([categoryRow()])
  packageCategory.findFirst.mockResolvedValue(categoryRow())
  packageCategory.findUnique.mockResolvedValue(categoryRow())
  packageCategory.create.mockResolvedValue(categoryRow())
  packageCategory.update.mockResolvedValue(categoryRow())
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('package categories', () => {
  it('lists tenant categories with the exact public shape', async () => {
    // ARRANGE — default category fixture is active for this tenant.

    // ACT — request the tenant-scoped category collection.
    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/package-categories')
      .set(ADMIN_HEADERS)

    // ASSERT — the wire contract does not expose Prisma field names.
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'package_category',
            id: 'pcat_electronics',
            tenant_id: 'ten_reyes',
            provisioning_key: 'electronics',
            name: 'Electronics',
            slug: 'electronics',
            description: 'Consumer electronics and accessories.',
            icon: null,
            sort_order: 40,
            is_active: true,
            created_at: NOW - 100,
            updated_at: NOW - 100,
            deleted_at: null,
          },
        ],
        has_more: false,
        url: '/v1/tenants/ten_reyes/package-categories',
        total_count: null,
      },
      error: null,
    })
    expect(packageCategory.findMany).toHaveBeenCalledTimes(1)

    // AFTER — shared hooks reset timers and mocks.
  })

  it('filters inactive categories using an exact false query value', async () => {
    // ARRANGE — the repository can return an inactive row.
    packageCategory.findMany.mockResolvedValue([
      categoryRow({ id: 'pcat_other', isActive: false }),
    ])

    // ACT — false must not coerce to true.
    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/package-categories?is_active=false')
      .set(ADMIN_HEADERS)

    // ASSERT — the repository receives a real false boolean.
    expect(response.status).toBe(200)
    expect(packageCategory.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_reyes', deletedAt: null, isActive: false },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      take: 101,
    })

    // AFTER — shared hooks reset timers and mocks.
  })

  it('returns a registered not-found error for another tenant category', async () => {
    // ARRANGE — tenant-scoped lookup cannot see the category.
    packageCategory.findFirst.mockResolvedValue(null)

    // ACT — retrieve through the admin route.
    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/package-categories/pcat_other')
      .set(ADMIN_HEADERS)

    // ASSERT — no raw repository detail leaks to the client.
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'package-category/not-found',
        message: 'Package category not found.',
      },
    })

    // AFTER — shared hooks reset timers and mocks.
  })

  it('creates a tenant category when the slug is available', async () => {
    // ARRANGE — no conflicting slug exists.
    packageCategory.findFirst.mockResolvedValue(null)
    packageCategory.create.mockResolvedValue(
      categoryRow({
        id: 'pcat_camera',
        provisioningKey: null,
        name: 'Camera Gear',
        slug: 'camera-gear',
        description: null,
        sortOrder: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })
    )

    // ACT — create a tenant-authored flat category.
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/package-categories')
      .set(ADMIN_HEADERS)
      .send({ name: 'Camera Gear', slug: 'camera-gear' })

    // ASSERT — creation persists tenant ownership and no provisioning key.
    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      object: 'package_category',
      id: 'pcat_camera',
      tenant_id: 'ten_reyes',
      provisioning_key: null,
      name: 'Camera Gear',
      slug: 'camera-gear',
    })
    expect(packageCategory.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_reyes',
        name: 'Camera Gear',
        slug: 'camera-gear',
        description: null,
        icon: null,
        sortOrder: 0,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    })

    // AFTER — shared hooks reset timers and mocks.
  })

  it('rejects a duplicate tenant slug with the registered conflict', async () => {
    // ARRANGE — the slug already belongs to an active tenant category.
    packageCategory.findFirst.mockResolvedValue(categoryRow())

    // ACT — try to create the same slug again.
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/package-categories')
      .set(ADMIN_HEADERS)
      .send({ name: 'Electronics Again', slug: 'electronics' })

    // ASSERT — no write occurs after the conflict is detected.
    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'package-category/slug-conflict',
        message: 'A package category with that slug already exists.',
      },
    })
    expect(packageCategory.create).not.toHaveBeenCalled()

    // AFTER — shared hooks reset timers and mocks.
  })

  it('rejects invalid non-kebab slugs before the service runs', async () => {
    // ARRANGE — the body contains a value outside the durable slug contract.

    // ACT — submit the invalid body.
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/package-categories')
      .set(ADMIN_HEADERS)
      .send({ name: 'Bad', slug: '<script>alert(1)</script>' })

    // ASSERT — validation blocks repository access.
    expect(response.status).toBe(422)
    expect(response.body.error).toEqual({
      code: 'request/invalid',
      message:
        'Invalid string: must match pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/',
    })
    expect(packageCategory.findFirst).not.toHaveBeenCalled()
    expect(packageCategory.create).not.toHaveBeenCalled()

    // AFTER — shared hooks reset timers and mocks.
  })

  it('updates an existing category without changing its provisioning key', async () => {
    // ARRANGE — current category is provisioned and the new slug is available.
    packageCategory.findFirst
      .mockResolvedValueOnce(categoryRow())
      .mockResolvedValueOnce(null)
    packageCategory.update.mockResolvedValue(
      categoryRow({ name: 'Devices', slug: 'devices', updatedAt: NOW })
    )

    // ACT — tenant customizes mutable display data.
    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/package-categories/pcat_electronics')
      .set(ADMIN_HEADERS)
      .send({ name: 'Devices', slug: 'devices' })

    // ASSERT — only mutable fields and updatedAt are written.
    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      provisioning_key: 'electronics',
      name: 'Devices',
      slug: 'devices',
    })
    expect(packageCategory.update).toHaveBeenCalledWith({
      where: { id: 'pcat_electronics' },
      data: { name: 'Devices', slug: 'devices', updatedAt: NOW },
    })

    // AFTER — shared hooks reset timers and mocks.
  })

  it('rejects an update that collides with another category slug', async () => {
    // ARRANGE — current row exists but another row owns the requested slug.
    packageCategory.findFirst
      .mockResolvedValueOnce(categoryRow())
      .mockResolvedValueOnce(categoryRow({ id: 'pcat_other', slug: 'other' }))

    // ACT — attempt the conflicting rename.
    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/package-categories/pcat_electronics')
      .set(ADMIN_HEADERS)
      .send({ slug: 'other' })

    // ASSERT — the write is blocked with a stable conflict.
    expect(response.status).toBe(409)
    expect(response.body.error).toEqual({
      code: 'package-category/slug-conflict',
      message: 'A package category with that slug already exists.',
    })
    expect(packageCategory.update).not.toHaveBeenCalled()

    // AFTER — shared hooks reset timers and mocks.
  })

  it('archives a category instead of physically deleting it', async () => {
    // ARRANGE — the target category exists.
    packageCategory.findFirst.mockResolvedValue(categoryRow())

    // ACT — delete through the public resource contract.
    const response = await request(createApp())
      .delete('/v1/tenants/ten_reyes/package-categories/pcat_electronics')
      .set(ADMIN_HEADERS)

    // ASSERT — history is preserved through a soft archive update.
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'package_category',
        id: 'pcat_electronics',
        deleted: true,
      },
      error: null,
    })
    expect(packageCategory.update).toHaveBeenCalledWith({
      where: { id: 'pcat_electronics' },
      data: { isActive: false, deletedAt: NOW, updatedAt: NOW },
    })

    // AFTER — shared hooks reset timers and mocks.
  })

  it('preserves an existing provisioned category during reconciliation', async () => {
    // ARRANGE — provisioning key already resolves to a customized tenant row.
    packageCategory.findFirst.mockResolvedValue(
      categoryRow({ name: 'Devices', slug: 'devices' })
    )

    // ACT — reconcile the platform default again.
    const result = await reconcileProvisionedPackageCategories('ten_reyes', [
      {
        key: 'electronics',
        name: 'Electronics',
        description: null,
        icon: null,
        sort_order: 40,
        is_active: true,
      },
    ])

    // ASSERT — tenant customization is not overwritten.
    expect(result).toEqual({ reconciled: 1 })
    expect(packageCategory.create).not.toHaveBeenCalled()
    expect(packageCategory.update).not.toHaveBeenCalled()

    // AFTER — shared hooks reset timers and mocks.
  })

  it('adopts a matching tenant-authored slug without resetting its values', async () => {
    // ARRANGE — no provisioning key exists, but the tenant already owns the slug.
    packageCategory.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(
      categoryRow({
        provisioningKey: null,
        name: 'Electronic Goods',
        description: 'Tenant wording.',
      })
    )

    // ACT — reconcile the platform category.
    const result = await reconcileProvisionedPackageCategories('ten_reyes', [
      {
        key: 'electronics',
        name: 'Electronics',
        description: null,
        icon: null,
        sort_order: 40,
        is_active: true,
      },
    ])

    // ASSERT — only the stable platform identity is attached.
    expect(result).toEqual({ reconciled: 1 })
    expect(packageCategory.update).toHaveBeenCalledWith({
      where: { id: 'pcat_electronics' },
      data: { provisioningKey: 'electronics', updatedAt: NOW },
    })
    expect(packageCategory.create).not.toHaveBeenCalled()

    // AFTER — shared hooks reset timers and mocks.
  })

  it('creates a missing provisioned category from the platform defaults', async () => {
    // ARRANGE — neither provisioning key nor tenant slug exists.
    packageCategory.findFirst.mockResolvedValue(null)
    packageCategory.create.mockResolvedValue(
      categoryRow({ createdAt: NOW, updatedAt: NOW })
    )

    // ACT — reconcile one missing default.
    const result = await reconcileProvisionedPackageCategories('ten_reyes', [
      {
        key: 'electronics',
        name: 'Electronics',
        description: 'Consumer electronics and accessories.',
        icon: null,
        sort_order: 40,
        is_active: true,
      },
    ])

    // ASSERT — provisioned identity and default presentation are materialized.
    expect(result).toEqual({ reconciled: 1 })
    expect(packageCategory.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_reyes',
        provisioningKey: 'electronics',
        name: 'Electronics',
        slug: 'electronics',
        description: 'Consumer electronics and accessories.',
        icon: null,
        sortOrder: 40,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    })

    // AFTER — shared hooks reset timers and mocks.
  })
})
