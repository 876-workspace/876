import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_100_000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

const CATEGORY_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
}

function categoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pcat_electronics',
    tenantId: 'ten_reyes',
    provisioningKey: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: null,
    icon: null,
    sortOrder: 40,
    isActive: true,
    createdAt: NOW - 200,
    updatedAt: NOW - 200,
    deletedAt: null,
    ...overrides,
  }
}

function packageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pkg_kingston_1',
    tenantId: 'ten_reyes',
    customerId: 'cprof_kingston',
    branchId: 'br_kingston',
    mailboxId: 'mbx_1001',
    categoryId: null,
    category: null,
    trackingNum: 'JM-REYES-1001',
    status: 'PRE_ALERT' as const,
    packageType: 'CARTON' as const,
    description: 'Jamaican Blue Mountain coffee filters',
    quantity: 1,
    actualWeight: 2.5,
    collectedAt: null,
    createdAt: NOW - 100,
    updatedAt: NOW - 100,
    ...overrides,
  }
}

const {
  packageModel,
  packageCategory,
  courierCustomerProfile,
  branch,
  mailbox,
} = vi.hoisted(() => ({
  packageModel: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  packageCategory: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  courierCustomerProfile: { findFirst: vi.fn() },
  branch: { findFirst: vi.fn() },
  mailbox: { findFirst: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    package: packageModel,
    packageCategory,
    courierCustomerProfile,
    branch,
    mailbox,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/application')
const { resetSettingsForTest } = await import('@/config')
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
  packageModel.findMany.mockResolvedValue([packageRow()])
  packageModel.findFirst.mockResolvedValue(packageRow())
  packageModel.create.mockResolvedValue(packageRow())
  packageModel.update.mockResolvedValue(packageRow())
  packageCategory.findFirst.mockResolvedValue(categoryRow())
  courierCustomerProfile.findFirst.mockResolvedValue({ id: 'cprof_kingston' })
  branch.findFirst.mockResolvedValue({ id: 'br_kingston' })
  mailbox.findFirst.mockResolvedValue({ id: 'mbx_1001' })
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('packages', () => {
  it('returns the first package page and has_more when another row exists', async () => {
    // ARRANGE
    packageModel.findMany.mockResolvedValue([
      packageRow(),
      packageRow({ id: 'pkg_mobay_2', createdAt: NOW - 101 }),
    ])

    // ACT
    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/packages?limit=1')
      .set(ADMIN_HEADERS)

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'package',
            id: 'pkg_kingston_1',
            tenant_id: 'ten_reyes',
            customer_id: 'cprof_kingston',
            branch_id: 'br_kingston',
            mailbox_id: 'mbx_1001',
            category_id: null,
            category: null,
            tracking_num: 'JM-REYES-1001',
            status: 'PRE_ALERT',
            package_type: 'CARTON',
            description: 'Jamaican Blue Mountain coffee filters',
            quantity: 1,
            actual_weight: 2.5,
            collected_at: null,
            created_at: NOW - 100,
            updated_at: NOW - 100,
          },
        ],
        has_more: true,
        url: '/v1/tenants/ten_reyes/packages',
        total_count: null,
      },
      error: null,
    })
    expect(packageModel.findMany).toHaveBeenCalledTimes(1)
    expect(packageModel.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_reyes' },
      include: CATEGORY_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    })

    // AFTER
  })

  it('filters package rows by category before pagination', async () => {
    // ARRANGE
    packageModel.findMany.mockResolvedValue([
      packageRow({
        categoryId: 'pcat_electronics',
        category: {
          id: 'pcat_electronics',
          name: 'Electronics',
          slug: 'electronics',
        },
      }),
    ])

    // ACT
    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/packages?category_id=pcat_electronics')
      .set(ADMIN_HEADERS)

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body.data.data[0]).toMatchObject({
      category_id: 'pcat_electronics',
      category: {
        id: 'pcat_electronics',
        name: 'Electronics',
        slug: 'electronics',
      },
    })
    expect(packageModel.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_reyes', categoryId: 'pcat_electronics' },
      include: CATEGORY_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 26,
    })

    // AFTER
  })

  it('uses the created-at and id tuple for a starting_after package page', async () => {
    // ARRANGE
    packageModel.findFirst.mockResolvedValue(
      packageRow({ id: 'pkg_liguanea', createdAt: NOW - 10 })
    )
    packageModel.findMany.mockResolvedValue([
      packageRow({ id: 'pkg_mobay', createdAt: NOW - 20 }),
    ])

    // ACT
    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/packages?limit=1&starting_after=pkg_liguanea')
      .set(ADMIN_HEADERS)

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([
      expect.objectContaining({ id: 'pkg_mobay' }),
    ])
    expect(packageModel.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_reyes', id: 'pkg_liguanea' },
      include: CATEGORY_INCLUDE,
    })
    expect(packageModel.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_reyes',
        OR: [
          { createdAt: { lt: NOW - 10 } },
          { createdAt: NOW - 10, id: { lt: 'pkg_liguanea' } },
        ],
      },
      include: CATEGORY_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    })

    // AFTER
  })

  it('uses the reverse created-at and id tuple for an ending_before package page', async () => {
    // ARRANGE
    packageModel.findFirst.mockResolvedValue(
      packageRow({ id: 'pkg_old_harbour', createdAt: NOW - 30 })
    )
    packageModel.findMany.mockResolvedValue([
      packageRow({ id: 'pkg_liguanea', createdAt: NOW - 10 }),
    ])

    // ACT
    const response = await request(createApp())
      .get(
        '/v1/tenants/ten_reyes/packages?limit=1&ending_before=pkg_old_harbour'
      )
      .set(ADMIN_HEADERS)

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([
      expect.objectContaining({ id: 'pkg_liguanea' }),
    ])
    expect(packageModel.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_reyes',
        OR: [
          { createdAt: { gt: NOW - 30 } },
          { createdAt: NOW - 30, id: { gt: 'pkg_old_harbour' } },
        ],
      },
      include: CATEGORY_INCLUDE,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 2,
    })

    // AFTER
  })

  it('returns an empty page when a package cursor is not tenant-scoped', async () => {
    // ARRANGE
    packageModel.findFirst.mockResolvedValue(null)

    // ACT
    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/packages?starting_after=pkg_other_tenant')
      .set(ADMIN_HEADERS)

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([])
    expect(packageModel.findMany).not.toHaveBeenCalled()

    // AFTER
  })

  it('rejects a cross-tenant customer before creating a package', async () => {
    // ARRANGE
    courierCustomerProfile.findFirst.mockResolvedValue(null)

    // ACT
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/packages')
      .set(ADMIN_HEADERS)
      .send({ customer_id: 'cprof_other_tenant' })

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'customer/not-found', message: 'Customer not found.' },
    })
    expect(packageModel.create).not.toHaveBeenCalled()

    // AFTER
  })

  it('rejects a cross-tenant branch before creating a package', async () => {
    // ARRANGE
    branch.findFirst.mockResolvedValue(null)

    // ACT
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/packages')
      .set(ADMIN_HEADERS)
      .send({ customer_id: 'cprof_kingston', branch_id: 'br_other_tenant' })

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'branch/not-found',
      message: 'Branch not found.',
    })
    expect(packageModel.create).not.toHaveBeenCalled()

    // AFTER
  })

  it('rejects a cross-tenant mailbox before creating a package', async () => {
    // ARRANGE
    mailbox.findFirst.mockResolvedValue(null)

    // ACT
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/packages')
      .set(ADMIN_HEADERS)
      .send({ customer_id: 'cprof_kingston', mailbox_id: 'mbx_other_tenant' })

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'mailbox/not-found',
      message: 'Mailbox not found.',
    })
    expect(packageModel.create).not.toHaveBeenCalled()

    // AFTER
  })

  it('rejects an inactive category before creating a package', async () => {
    // ARRANGE
    packageCategory.findFirst.mockResolvedValue(categoryRow({ isActive: false }))

    // ACT
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/packages')
      .set(ADMIN_HEADERS)
      .send({
        customer_id: 'cprof_kingston',
        category_id: 'pcat_electronics',
      })

    // ASSERT
    expect(response.status).toBe(409)
    expect(response.body.error).toEqual({
      code: 'package-category/inactive',
      message: 'That package category is inactive.',
    })
    expect(packageModel.create).not.toHaveBeenCalled()

    // AFTER
  })

  it('creates a package with a tenant-owned active category', async () => {
    // ARRANGE
    packageCategory.findFirst.mockResolvedValue(categoryRow())
    packageModel.create.mockResolvedValue(
      packageRow({
        categoryId: 'pcat_electronics',
        category: {
          id: 'pcat_electronics',
          name: 'Electronics',
          slug: 'electronics',
        },
      })
    )

    // ACT
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/packages')
      .set(ADMIN_HEADERS)
      .send({
        customer_id: 'cprof_kingston',
        category_id: 'pcat_electronics',
      })

    // ASSERT
    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      category_id: 'pcat_electronics',
      category: {
        id: 'pcat_electronics',
        name: 'Electronics',
        slug: 'electronics',
      },
    })
    expect(packageModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_reyes',
        customerId: 'cprof_kingston',
        categoryId: 'pcat_electronics',
      }),
      include: CATEGORY_INCLUDE,
    })

    // AFTER
  })

  it('rejects a cross-tenant category before updating a package', async () => {
    // ARRANGE
    packageModel.findFirst.mockResolvedValue(packageRow())
    packageCategory.findFirst.mockResolvedValue(null)

    // ACT
    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/packages/pkg_kingston_1')
      .set(ADMIN_HEADERS)
      .send({ category_id: 'pcat_other_tenant' })

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'package-category/not-found',
      message: 'Package category not found.',
    })
    expect(packageModel.update).not.toHaveBeenCalled()

    // AFTER
  })

  it('rejects a cross-tenant branch before updating a package', async () => {
    // ARRANGE
    packageModel.findFirst.mockResolvedValue(packageRow())
    branch.findFirst.mockResolvedValue(null)

    // ACT
    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/packages/pkg_kingston_1')
      .set(ADMIN_HEADERS)
      .send({ branch_id: 'br_other_tenant' })

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'branch/not-found',
      message: 'Branch not found.',
    })
    expect(packageModel.update).not.toHaveBeenCalled()

    // AFTER
  })

  it('rejects a cross-tenant mailbox before updating a package', async () => {
    // ARRANGE
    packageModel.findFirst.mockResolvedValue(packageRow())
    mailbox.findFirst.mockResolvedValue(null)

    // ACT
    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/packages/pkg_kingston_1')
      .set(ADMIN_HEADERS)
      .send({ mailbox_id: 'mbx_other_tenant' })

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'mailbox/not-found',
      message: 'Mailbox not found.',
    })
    expect(packageModel.update).not.toHaveBeenCalled()

    // AFTER
  })

  it('returns a registered package error when the update target is missing', async () => {
    // ARRANGE
    packageModel.findFirst.mockResolvedValue(null)

    // ACT
    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/packages/pkg_missing')
      .set(ADMIN_HEADERS)
      .send({ description: 'Updated contents' })

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'package/not-found',
      message: 'Package not found.',
    })
    expect(packageModel.update).not.toHaveBeenCalled()

    // AFTER
  })
})
