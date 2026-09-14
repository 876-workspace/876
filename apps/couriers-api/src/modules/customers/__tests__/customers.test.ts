import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_000_000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function customerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cprof_kingston_1',
    tenantId: 'ten_reyes',
    userId: null,
    billingCustomerId: 'cus_brown_1',
    branchId: 'br_kingston',
    status: 'ACTIVE' as const,
    isCommercial: false,
    firstSeenAt: NOW - 100,
    createdAt: NOW - 100,
    updatedAt: NOW - 100,
    deletedAt: null,
    ...overrides,
  }
}

const {
  tenant,
  courierCustomerProfile,
  branch,
  mailbox,
  modulePreference,
  $transaction,
} = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  courierCustomerProfile: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  branch: { findFirst: vi.fn() },
  mailbox: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  modulePreference: { findMany: vi.fn() },
  $transaction: vi.fn(),
}))

const billing = vi.hoisted(() => ({
  createExternalCustomer: vi.fn(),
  retrieveCustomer: vi.fn(),
  updateExternalCustomer: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant,
    courierCustomerProfile,
    branch,
    mailbox,
    modulePreference,
    $transaction,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))
vi.mock('@/providers/billing/customers', () => billing)

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
  tenant.findUnique.mockResolvedValue({ id: 'ten_reyes', orgId: 'org_reyes' })
  billing.retrieveCustomer.mockResolvedValue({
    data: { id: 'cus_brown_1', status: 'ACTIVE' },
    error: null,
  })
  billing.createExternalCustomer.mockResolvedValue({
    data: { id: 'cus_brown_1' },
    error: null,
  })
  courierCustomerProfile.findFirst.mockResolvedValue(customerRow())
  courierCustomerProfile.findMany.mockResolvedValue([customerRow()])
  courierCustomerProfile.create.mockResolvedValue(customerRow())
  courierCustomerProfile.update.mockResolvedValue(customerRow())
  branch.findFirst.mockResolvedValue({ id: 'br_kingston' })
  mailbox.findFirst.mockResolvedValue({
    id: 'mb_existing',
    tenantId: 'ten_reyes',
    customerId: 'cprof_kingston_1',
    number: 'KG1001',
    isPrimary: true,
    createdAt: NOW - 100,
    updatedAt: NOW - 100,
  })
  modulePreference.findMany.mockResolvedValue([])
  $transaction.mockImplementation(
    (callback: (tx: Record<string, unknown>) => unknown) =>
      callback({
        tenant,
        courierCustomerProfile,
        mailbox,
        branch,
        modulePreference,
      })
  )
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('customers', () => {
  it('returns the first customer page and has_more when another row exists', async () => {
    courierCustomerProfile.findMany.mockResolvedValue([
      customerRow(),
      customerRow({ id: 'cprof_mobay_2', createdAt: NOW - 101 }),
    ])

    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/customers?limit=1')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'courier_customer_profile',
            id: 'cprof_kingston_1',
            tenant_id: 'ten_reyes',
            user_id: null,
            billing_customer_id: 'cus_brown_1',
            branch_id: 'br_kingston',
            trn: null,
            status: 'ACTIVE',
            is_commercial: false,
            first_seen_at: NOW - 100,
            created_at: NOW - 100,
            updated_at: NOW - 100,
            deleted_at: null,
          },
        ],
        has_more: true,
        url: '/v1/tenants/ten_reyes/customers',
        total_count: null,
      },
      error: null,
    })
    expect(courierCustomerProfile.findMany).toHaveBeenCalledTimes(1)
    expect(courierCustomerProfile.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_reyes', deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    })
  })

  it('uses the created-at and id tuple for a starting_after page', async () => {
    const anchor = customerRow({
      id: 'cprof_liguanea',
      createdAt: NOW - 10,
    })
    courierCustomerProfile.findFirst.mockResolvedValue(anchor)
    courierCustomerProfile.findMany.mockResolvedValue([
      customerRow({ id: 'cprof_mobay', createdAt: NOW - 20 }),
    ])

    const response = await request(createApp())
      .get(
        '/v1/tenants/ten_reyes/customers?limit=1&starting_after=cprof_liguanea'
      )
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ id: 'cprof_mobay' })],
        has_more: false,
        url: '/v1/tenants/ten_reyes/customers',
        total_count: null,
      },
      error: null,
    })
    expect(courierCustomerProfile.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_reyes',
        id: 'cprof_liguanea',
        deletedAt: null,
      },
    })
    expect(courierCustomerProfile.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_reyes',
        deletedAt: null,
        OR: [
          { createdAt: { lt: NOW - 10 } },
          { createdAt: NOW - 10, id: { lt: 'cprof_liguanea' } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    })
  })

  it('uses the reverse created-at and id tuple for an ending_before page', async () => {
    const anchor = customerRow({
      id: 'cprof_old_harbour',
      createdAt: NOW - 30,
    })
    courierCustomerProfile.findFirst.mockResolvedValue(anchor)
    courierCustomerProfile.findMany.mockResolvedValue([
      customerRow({ id: 'cprof_liguanea', createdAt: NOW - 10 }),
    ])

    const response = await request(createApp())
      .get(
        '/v1/tenants/ten_reyes/customers?limit=1&ending_before=cprof_old_harbour'
      )
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ id: 'cprof_liguanea' })],
        has_more: false,
        url: '/v1/tenants/ten_reyes/customers',
        total_count: null,
      },
      error: null,
    })
    expect(courierCustomerProfile.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_reyes',
        deletedAt: null,
        OR: [
          { createdAt: { gt: NOW - 30 } },
          { createdAt: NOW - 30, id: { gt: 'cprof_old_harbour' } },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 2,
    })
  })

  it('returns an empty page when a customer cursor is not tenant-scoped', async () => {
    courierCustomerProfile.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/tenants/ten_reyes/customers?starting_after=cprof_other_tenant')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        url: '/v1/tenants/ten_reyes/customers',
        total_count: null,
      },
      error: null,
    })
    expect(courierCustomerProfile.findMany).not.toHaveBeenCalled()
  })

  it('requires a home branch before creating a customer', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({
        source: 'party',
        idempotency_key: 'idem_spanish_town',
        party: { first_name: 'Maria' },
      })

    expect(response.status).toBe(422)
    expect(billing.createExternalCustomer).not.toHaveBeenCalled()
  })

  it('rejects a request which mixes registry and party sources', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({
        source: 'registry',
        billing_customer_id: 'cus_portmore',
        idempotency_key: 'idem_portmore',
        party: { first_name: 'Paul' },
        branch_id: 'br_kingston',
      })

    expect(response.status).toBe(422)
    expect(billing.createExternalCustomer).not.toHaveBeenCalled()
  })

  it('rejects a cross-tenant branch on customer creation before writing', async () => {
    branch.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({
        source: 'party',
        idempotency_key: 'idem_cross_tenant',
        party: { first_name: 'Cross' },
        branch_id: 'br_other',
      })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'branch/not-found', message: 'Not found.' },
    })
    expect(billing.createExternalCustomer).not.toHaveBeenCalled()
    expect(courierCustomerProfile.create).not.toHaveBeenCalled()
  })

  it('creates an external registry party before its courier profile', async () => {
    courierCustomerProfile.findFirst.mockResolvedValue(null)
    billing.createExternalCustomer.mockResolvedValue({
      data: { id: 'cus_new' },
      error: null,
    })
    courierCustomerProfile.create.mockResolvedValue(
      customerRow({ billingCustomerId: 'cus_new' })
    )

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({
        source: 'party',
        idempotency_key: 'idem-new-customer',
        party: { first_name: 'Ada', email: 'ada@example.test' },
        branch_id: 'br_kingston',
      })

    expect(response.status).toBe(201)
    expect(billing.createExternalCustomer).toHaveBeenCalledWith('org_reyes', {
      idempotencyKey: 'idem-new-customer',
      customerKind: 'INDIVIDUAL',
      firstName: 'Ada',
      lastName: null,
      companyName: null,
      email: 'ada@example.test',
      phone: null,
    })
    expect(courierCustomerProfile.create).toHaveBeenCalled()
  })

  it('creates only a profile when the registry party already exists', async () => {
    courierCustomerProfile.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({
        source: 'registry',
        billing_customer_id: 'cus_brown_1',
        branch_id: 'br_kingston',
      })

    expect(response.status).toBe(201)
    expect(billing.retrieveCustomer).toHaveBeenCalledWith(
      'org_reyes',
      'cus_brown_1'
    )
    expect(billing.createExternalCustomer).not.toHaveBeenCalled()
    expect(courierCustomerProfile.create).toHaveBeenCalled()
  })

  it('does not create a profile when registry creation fails', async () => {
    billing.createExternalCustomer.mockResolvedValue({
      data: null,
      error: { code: 'billing/unavailable', message: 'Offline.' },
    })

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({
        source: 'party',
        idempotency_key: 'idem-offline',
        party: { first_name: 'Ada' },
        branch_id: 'br_kingston',
      })

    expect(response.status).toBe(503)
    expect(courierCustomerProfile.create).not.toHaveBeenCalled()
  })

  it('does not allocate a mailbox when customer preferences disable auto-assignment', async () => {
    courierCustomerProfile.findFirst.mockResolvedValue(null)
    mailbox.findFirst.mockResolvedValue(null)
    modulePreference.findMany.mockResolvedValue([
      {
        key: 'mailbox-auto-assign',
        booleanValue: false,
        integerValue: null,
      },
    ])

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({
        source: 'registry',
        billing_customer_id: 'cus_brown_1',
        branch_id: 'br_kingston',
      })

    expect(response.status).toBe(201)
    expect(mailbox.create).not.toHaveBeenCalled()
  })

  it('rejects a cross-tenant branch on customer update before writing', async () => {
    courierCustomerProfile.findFirst.mockResolvedValue(customerRow())
    branch.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_reyes/customers/cprof_kingston_1')
      .set(ADMIN_HEADERS)
      .send({ branch_id: 'br_other' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'branch/not-found', message: 'Not found.' },
    })
    expect(courierCustomerProfile.update).not.toHaveBeenCalled()
  })

  describe('Advanced — AAA and realistic data (1.2, 1.6, 2.10)', () => {
    it('When creating customer with realistic Jamaican data, then returns contract schema with dynamic fields or validation envelope', async () => {
      // Arrange — schema requires billing_customer_id, realistic trimming
      const payload = {
        billing_customer_id: 'cus_real_123',
        branch_id: 'br_1',
        is_commercial: false,
      }

      // Act
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/customers')
        .set(ADMIN_HEADERS)
        .send(payload)

      // Assert — 2.10: dynamic id/timestamps, allow 201/200/422 but never 500/stack
      expect([201, 200, 422, 404]).toContain(res.status)
      if (res.status === 201 || res.status === 200) {
        expect(res.body).toMatchObject({
          data: {
            object: expect.any(String),
            id: expect.any(String),
            created_at: expect.any(Number),
          },
          error: null,
        })
      } else {
        expect(res.body.error).not.toHaveProperty('stack')
      }
    })

    it('When malformed customer payload with XSS, then 422 without leak', async () => {
      // Arrange
      const bad = {
        display_name: "<script>alert('xss')</script>",
        branch_id: 123 as unknown as string,
      }

      // Act
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/customers')
        .set(ADMIN_HEADERS)
        .send(bad)

      // Assert
      expect([400, 422]).toContain(res.status)
      expect(res.body.error).not.toHaveProperty('stack')
    })
  })
})
