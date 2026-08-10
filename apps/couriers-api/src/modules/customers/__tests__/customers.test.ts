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

const { tenant, courierCustomerProfile, branch, mailbox, $transaction } =
  vi.hoisted(() => ({
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
    $transaction: vi.fn(),
  }))

vi.mock('@/db/client', () => ({
  prisma: { tenant, courierCustomerProfile, branch, mailbox, $transaction },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')
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
  tenant.findUnique.mockResolvedValue({ id: 'ten_reyes' })
  courierCustomerProfile.findFirst.mockResolvedValue(customerRow())
  courierCustomerProfile.findMany.mockResolvedValue([customerRow()])
  courierCustomerProfile.create.mockResolvedValue(customerRow())
  courierCustomerProfile.update.mockResolvedValue(customerRow())
  branch.findFirst.mockResolvedValue({ id: 'br_kingston' })
  $transaction.mockImplementation(
    (callback: (tx: Record<string, unknown>) => unknown) =>
      callback({ tenant, courierCustomerProfile, mailbox, branch })
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

  it('uses the tenant default branch when customer creation omits branch_id', async () => {
    courierCustomerProfile.create.mockResolvedValue(
      customerRow({ id: 'cprof_spanish_town', branchId: 'br_spanish_town' })
    )
    branch.findFirst.mockResolvedValue({ id: 'br_spanish_town' })

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({ billing_customer_id: 'cus_spanish_town' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: expect.objectContaining({
        object: 'courier_customer_profile',
        id: 'cprof_spanish_town',
        branch_id: 'br_spanish_town',
      }),
      error: null,
    })
    expect(branch.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_reyes', isDefault: true },
      select: { id: true },
    })
    expect(courierCustomerProfile.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_reyes',
        billingCustomerId: 'cus_spanish_town',
        userId: null,
        branchId: 'br_spanish_town',
        trn: null,
        status: 'ACTIVE',
        isCommercial: false,
        firstSeenAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      },
    })
  })

  it('keeps branch_id null when customer creation explicitly clears it', async () => {
    courierCustomerProfile.create.mockResolvedValue(
      customerRow({ id: 'cprof_portmore', branchId: null })
    )

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({ billing_customer_id: 'cus_portmore', branch_id: null })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: expect.objectContaining({
        object: 'courier_customer_profile',
        id: 'cprof_portmore',
        branch_id: null,
      }),
      error: null,
    })
    expect(branch.findFirst).not.toHaveBeenCalled()
    expect(courierCustomerProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ branchId: null }),
    })
  })

  it('rejects a cross-tenant branch on customer creation before writing', async () => {
    branch.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/customers')
      .set(ADMIN_HEADERS)
      .send({ billing_customer_id: 'cus_cross_tenant', branch_id: 'br_other' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'branch/not-found', message: 'Not found.' },
    })
    expect(courierCustomerProfile.create).not.toHaveBeenCalled()
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

  describe('enrollments', () => {
    function stubEnrollment() {
      courierCustomerProfile.findFirst.mockResolvedValue(null)
      courierCustomerProfile.create.mockResolvedValue(
        customerRow({ id: 'cprof_enrolled' })
      )
      tenant.findUnique.mockResolvedValue({
        id: 'ten_reyes',
        mailboxPrefix: 'KG',
      })
      mailbox.findFirst.mockResolvedValue(null)
      mailbox.findUnique.mockResolvedValue(null)
      mailbox.count.mockResolvedValue(0)
      mailbox.create.mockResolvedValue({
        id: 'mb_1001',
        tenantId: 'ten_reyes',
        customerId: 'cprof_enrolled',
        number: 'KG1001',
        isPrimary: true,
        createdAt: NOW,
        updatedAt: NOW,
      })
    }

    it('retries once when the mailbox-number insert loses a P2002 race', async () => {
      stubEnrollment()
      mailbox.create
        .mockRejectedValueOnce({ code: 'P2002' })
        .mockResolvedValue({
          id: 'mb_1001',
          tenantId: 'ten_reyes',
          customerId: 'cprof_enrolled',
          number: 'KG1001',
          isPrimary: true,
          createdAt: NOW,
          updatedAt: NOW,
        })

      const response = await request(createApp())
        .post('/v1/tenants/ten_reyes/customers/enrollments')
        .set(ADMIN_HEADERS)
        .send({ billing_customer_id: 'cus_enroll_1' })

      expect(response.status).toBe(201)
      expect(response.body).toEqual({
        data: expect.objectContaining({
          object: 'courier_customer_enrollment',
          customer: expect.objectContaining({ id: 'cprof_enrolled' }),
          mailbox: expect.objectContaining({ number: 'KG1001' }),
        }),
        error: null,
      })
      expect(courierCustomerProfile.create).toHaveBeenCalledTimes(2)
      expect(mailbox.create).toHaveBeenCalledTimes(2)
    })

    it('returns 409 when the mailbox-number race persists across retries', async () => {
      stubEnrollment()
      mailbox.create.mockRejectedValue({ code: 'P2002' })

      const response = await request(createApp())
        .post('/v1/tenants/ten_reyes/customers/enrollments')
        .set(ADMIN_HEADERS)
        .send({ billing_customer_id: 'cus_enroll_2' })

      expect(response.status).toBe(409)
      expect(response.body).toEqual({
        data: null,
        error: expect.objectContaining({ code: 'customer/conflict' }),
      })
      expect(mailbox.create).toHaveBeenCalledTimes(3)
    })

    it('maps a branch foreign-key violation to a 404', async () => {
      stubEnrollment()
      courierCustomerProfile.create.mockRejectedValue({ code: 'P2003' })

      const response = await request(createApp())
        .post('/v1/tenants/ten_reyes/customers/enrollments')
        .set(ADMIN_HEADERS)
        .send({ billing_customer_id: 'cus_enroll_3' })

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        data: null,
        error: expect.objectContaining({ code: 'branch/not-found' }),
      })
    })
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
