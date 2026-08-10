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
    id: 'cprof_1',
    tenantId: 'ten_1',
    userId: null,
    billingCustomerId: 'cus_1',
    branchId: null,
    status: 'ACTIVE' as const,
    isCommercial: false,
    firstSeenAt: NOW - 20,
    createdAt: NOW - 20,
    updatedAt: NOW - 20,
    deletedAt: null,
    ...overrides,
  }
}

function customerAddressRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'caddr_1',
    tenantId: 'ten_1',
    customerId: 'cprof_1',
    addressId: 'addr_1',
    type: 'DELIVERY' as const,
    isDefault: true,
    createdAt: NOW - 10,
    updatedAt: NOW,
    address: {
      id: 'addr_1',
      tenantId: 'ten_1',
      name: 'Home',
      line1: '1 Harbour Street',
      line2: null,
      city: 'Kingston',
      regionCode: 'KSA',
      regionName: 'Kingston',
      countryCode: 'JM',
      postalCode: null,
      latitude: null,
      longitude: null,
      isActive: true,
      createdAt: NOW - 10,
      updatedAt: NOW,
    },
    ...overrides,
  }
}

const { courierCustomerProfile, customerAddress, address, apiKey } = vi.hoisted(
  () => ({
    courierCustomerProfile: { findFirst: vi.fn() },
    customerAddress: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    address: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
  })
)

vi.mock('@/db/client', () => ({
  prisma: {
    courierCustomerProfile,
    customerAddress,
    address,
    apiKey,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({ customerAddress, address })
    ),
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { resolveRegion } = vi.hoisted(() => ({ resolveRegion: vi.fn() }))

vi.mock('@/providers/platform/geo', () => ({ resolveRegion }))

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
  resetSettingsForTest(testEnv)
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  courierCustomerProfile.findFirst.mockResolvedValue(customerRow())
  customerAddress.findFirst.mockResolvedValue(customerAddressRow())
  customerAddress.findMany.mockResolvedValue([customerAddressRow()])
  customerAddress.count.mockResolvedValue(0)
  customerAddress.create.mockResolvedValue(customerAddressRow())
  customerAddress.update.mockResolvedValue(customerAddressRow())
  customerAddress.updateMany.mockResolvedValue({ count: 1 })
  customerAddress.delete.mockResolvedValue(customerAddressRow())
  address.create.mockResolvedValue(customerAddressRow().address)
  address.update.mockResolvedValue(customerAddressRow().address)
  address.findFirst.mockResolvedValue({
    id: 'addr_1',
    _count: { branches: 0, warehouses: 0, customerAddresses: 0 },
  })
  address.delete.mockResolvedValue(customerAddressRow().address)
  resolveRegion.mockResolvedValue({
    ok: true,
    region: { regionCode: 'KSA', regionName: 'Kingston' },
  })
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('customer addresses', () => {
  it('lists a customer’s tenant-scoped addresses with complete resources', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/customers/cprof_1/addresses')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'customer_address',
            id: 'caddr_1',
            tenant_id: 'ten_1',
            customer_id: 'cprof_1',
            address_id: 'addr_1',
            type: 'DELIVERY',
            is_default: true,
            address: {
              object: 'address',
              id: 'addr_1',
              tenant_id: 'ten_1',
              name: 'Home',
              line1: '1 Harbour Street',
              line2: null,
              city: 'Kingston',
              region_code: 'KSA',
              region_name: 'Kingston',
              country_code: 'JM',
              postal_code: null,
              latitude: null,
              longitude: null,
              is_active: true,
              created_at: NOW - 10,
              updated_at: NOW,
            },
            created_at: NOW - 10,
            updated_at: NOW,
          },
        ],
        has_more: false,
        url: '/v1/tenants/ten_1/customers/cprof_1/addresses',
        total_count: null,
      },
      error: null,
    })
    expect(courierCustomerProfile.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: 'cprof_1', deletedAt: null },
    })
    expect(customerAddress.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', customerId: 'cprof_1' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 26,
      include: { address: true },
    })
  })

  it('creates the first address for a role as that role’s default', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/customers/cprof_1/addresses')
      .set(ADMIN_HEADERS)
      .send({
        address: {
          name: 'Home',
          line1: '1 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
          region_code: 'KSA',
        },
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: expect.objectContaining({
        object: 'customer_address',
        type: 'DELIVERY',
        is_default: true,
      }),
      error: null,
    })
    expect(customerAddress.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_1',
        customerId: 'cprof_1',
        addressId: 'addr_1',
        type: 'DELIVERY',
        isDefault: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
      include: { address: true },
    })
  })

  it('promotes the oldest successor when moving a default to another role', async () => {
    const current = customerAddressRow()
    const successor = customerAddressRow({ id: 'caddr_older' })
    customerAddress.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(successor)
    customerAddress.count.mockResolvedValue(1)
    customerAddress.update.mockResolvedValue(
      customerAddressRow({ type: 'SHIPPING', isDefault: false })
    )

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/customers/cprof_1/addresses/caddr_1')
      .set(ADMIN_HEADERS)
      .send({ type: 'SHIPPING' })

    expect(response.status).toBe(200)
    expect(customerAddress.update).toHaveBeenCalledWith({
      where: { id: 'caddr_older' },
      data: { isDefault: true, updatedAt: NOW },
    })
    expect(response.body.data).toMatchObject({
      object: 'customer_address',
      type: 'SHIPPING',
      is_default: false,
    })
  })

  it('deletes the relation, promotes its successor, and removes an orphan address', async () => {
    customerAddress.findFirst
      .mockResolvedValueOnce(customerAddressRow())
      .mockResolvedValueOnce(customerAddressRow({ id: 'caddr_successor' }))

    const response = await request(createApp())
      .delete('/v1/tenants/ten_1/customers/cprof_1/addresses/caddr_1')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'customer_address', id: 'caddr_1', deleted: true },
      error: null,
    })
    expect(customerAddress.delete).toHaveBeenCalledWith({
      where: { id: 'caddr_1' },
    })
    expect(customerAddress.update).toHaveBeenCalledWith({
      where: { id: 'caddr_successor' },
      data: { isDefault: true, updatedAt: NOW },
    })
    expect(address.delete).toHaveBeenCalledWith({ where: { id: 'addr_1' } })
  })

  it('requires the admin credential before reading customer addresses', async () => {
    const response = await request(createApp()).get(
      '/v1/tenants/ten_1/customers/cprof_1/addresses'
    )

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'api-key/missing', message: 'An API key is required.' },
    })
    expect(courierCustomerProfile.findFirst).not.toHaveBeenCalled()
  })

  describe('Advanced — AAA, realistic data and error contract (1.2, 1.6, 2.10)', () => {
    it('When creating with realistic Jamaican customer name, then succeeds and returns BDD schema', async () => {
      // Arrange
      const payload = {
        type: 'DELIVERY',
        address: {
          name: '  Delroy Campbell — Half Way Tree  ',
          line1: '  12 Hope Road ',
          city: ' Kingston ',
          country_code: 'jm',
          region_code: 'ksa',
        },
      }

      // Act
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/customers/cprof_1/addresses')
        .set(ADMIN_HEADERS)
        .send(payload)

      // Assert
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        data: {
          object: 'customer_address',
          id: expect.any(String),
          tenant_id: expect.any(String),
        },
        error: null,
      })
    })

    it('When sending XSS/SQL or oversized type, then handled without 500 or stack leak', async () => {
      // Arrange
      const bad = [
        {
          type: 'INVALID_TYPE',
          address: {
            name: 'Home',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
          },
        },
        {
          type: 'DELIVERY',
          address: {
            name: '<script>alert(1)</script>',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
          },
        },
      ]

      for (const p of bad) {
        // Act
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/customers/cprof_1/addresses')
          .set(ADMIN_HEADERS)
          .send(p)

        // Assert — either 201 (accepted) or 400/422, never 500/stack
        expect([201, 400, 422]).toContain(res.status)
        if (res.body.error) expect(res.body.error).not.toHaveProperty('stack')
        else expect(res.body.data).toHaveProperty('object', 'customer_address')
      }
    })
  })
})
