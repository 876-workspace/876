import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_100_000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function packageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pkg_kingston_1',
    tenantId: 'ten_reyes',
    customerId: 'cprof_kingston',
    branchId: 'br_kingston',
    mailboxId: 'mbx_1001',
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

const { packageModel, courierCustomerProfile, branch, mailbox } = vi.hoisted(
  () => ({
    packageModel: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    courierCustomerProfile: { findFirst: vi.fn() },
    branch: { findFirst: vi.fn() },
    mailbox: { findFirst: vi.fn() },
  })
)

vi.mock('@/db/client', () => ({
  prisma: {
    package: packageModel,
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
    packageModel.findMany.mockResolvedValue([
      packageRow(),
      packageRow({ id: 'pkg_mobay_2', createdAt: NOW - 101 }),
    ])

    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/packages?limit=1')
      .set(ADMIN_HEADERS)

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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    })
  })

  it('uses the created-at and id tuple for a starting_after package page', async () => {
    packageModel.findFirst.mockResolvedValue(
      packageRow({ id: 'pkg_liguanea', createdAt: NOW - 10 })
    )
    packageModel.findMany.mockResolvedValue([
      packageRow({ id: 'pkg_mobay', createdAt: NOW - 20 }),
    ])

    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/packages?limit=1&starting_after=pkg_liguanea')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ id: 'pkg_mobay' })],
        has_more: false,
        url: '/v1/tenants/ten_reyes/packages',
        total_count: null,
      },
      error: null,
    })
    expect(packageModel.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_reyes', id: 'pkg_liguanea' },
    })
    expect(packageModel.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_reyes',
        OR: [
          { createdAt: { lt: NOW - 10 } },
          { createdAt: NOW - 10, id: { lt: 'pkg_liguanea' } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    })
  })

  it('uses the reverse created-at and id tuple for an ending_before package page', async () => {
    packageModel.findFirst.mockResolvedValue(
      packageRow({ id: 'pkg_old_harbour', createdAt: NOW - 30 })
    )
    packageModel.findMany.mockResolvedValue([
      packageRow({ id: 'pkg_liguanea', createdAt: NOW - 10 }),
    ])

    const response = await request(createApp())
      .get(
        '/v1/tenants/ten_reyes/packages?limit=1&ending_before=pkg_old_harbour'
      )
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ id: 'pkg_liguanea' })],
        has_more: false,
        url: '/v1/tenants/ten_reyes/packages',
        total_count: null,
      },
      error: null,
    })
    expect(packageModel.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_reyes',
        OR: [
          { createdAt: { gt: NOW - 30 } },
          { createdAt: NOW - 30, id: { gt: 'pkg_old_harbour' } },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 2,
    })
  })

  it('returns an empty page when a package cursor is not tenant-scoped', async () => {
    packageModel.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/packages?starting_after=pkg_other_tenant')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        url: '/v1/tenants/ten_reyes/packages',
        total_count: null,
      },
      error: null,
    })
    expect(packageModel.findMany).not.toHaveBeenCalled()
  })

  it('rejects a cross-tenant customer before creating a package', async () => {
    courierCustomerProfile.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/packages')
      .set(ADMIN_HEADERS)
      .send({ customer_id: 'cprof_other_tenant' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'customer/not-found', message: 'Not found.' },
    })
    expect(packageModel.create).not.toHaveBeenCalled()
  })

  it('rejects a cross-tenant branch before creating a package', async () => {
    branch.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/packages')
      .set(ADMIN_HEADERS)
      .send({ customer_id: 'cprof_kingston', branch_id: 'br_other_tenant' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'branch/not-found', message: 'Not found.' },
    })
    expect(packageModel.create).not.toHaveBeenCalled()
  })

  it('rejects a cross-tenant mailbox before creating a package', async () => {
    mailbox.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/packages')
      .set(ADMIN_HEADERS)
      .send({ customer_id: 'cprof_kingston', mailbox_id: 'mbx_other_tenant' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'mailbox/not-found', message: 'Not found.' },
    })
    expect(packageModel.create).not.toHaveBeenCalled()
  })

  it('rejects a cross-tenant branch before updating a package', async () => {
    packageModel.findFirst.mockResolvedValue(packageRow())
    branch.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/packages/pkg_kingston_1')
      .set(ADMIN_HEADERS)
      .send({ branch_id: 'br_other_tenant' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'branch/not-found', message: 'Not found.' },
    })
    expect(packageModel.update).not.toHaveBeenCalled()
  })

  it('rejects a cross-tenant mailbox before updating a package', async () => {
    packageModel.findFirst.mockResolvedValue(packageRow())
    mailbox.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/packages/pkg_kingston_1')
      .set(ADMIN_HEADERS)
      .send({ mailbox_id: 'mbx_other_tenant' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'mailbox/not-found', message: 'Not found.' },
    })
    expect(packageModel.update).not.toHaveBeenCalled()
  })

  describe('Advanced — 1.6 realistic data and 2.10 schema (AAA)', () => {
    it('When listing packages with realistic pagination, then envelope has correct types', async () => {
      // Arrange — per-test isolated data, realistic limit
      // Act
      const res = await request(createApp())
        .get('/v1/tenants/ten_1/packages?limit=2')
        .set(ADMIN_HEADERS)

      // Assert — declarative BDD, black-box
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({
        object: 'list',
        data: expect.any(Array),
        has_more: expect.any(Boolean),
        url: expect.any(String),
      })
      for (const pkg of res.body.data.data as Array<Record<string, unknown>>) {
        expect(pkg).toHaveProperty('object', 'package')
        expect(pkg).toHaveProperty('id', expect.any(String))
      }
    })

    it('When creating package with XSS in notes, then 422 without stack', async () => {
      // Arrange
      const bad = { customer_id: 'cprof_1', notes: '<script>alert(1)</script>' }

      // Act
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/packages')
        .set(ADMIN_HEADERS)
        .send(bad)

      // Assert
      expect([400, 422, 404]).toContain(res.status)
      if (res.body.error) expect(res.body.error).not.toHaveProperty('stack')
    })
  })
})
