import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_000_000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function addressRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'addr_1',
    tenantId: 'ten_1',
    name: 'Kingston office',
    line1: '1 Harbour Street',
    line2: null,
    city: 'Kingston',
    regionCode: 'KSA',
    regionName: 'Kingston',
    countryCode: 'JM',
    postalCode: 'JMKN01',
    latitude: 18.0,
    longitude: -76.8,
    isActive: true,
    createdAt: NOW - 10,
    updatedAt: NOW,
    ...overrides,
  }
}

const { tenant, address, apiKey } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  address: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant,
    address,
    apiKey,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({ address })
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
  tenant.findUnique.mockResolvedValue({ id: 'ten_1' })
  address.findFirst.mockResolvedValue(addressRow())
  address.findMany.mockResolvedValue([addressRow()])
  address.create.mockResolvedValue(addressRow())
  address.update.mockResolvedValue(addressRow({ name: 'Updated office' }))
  address.delete.mockResolvedValue(addressRow())
  resolveRegion.mockResolvedValue({
    ok: true,
    region: { regionCode: 'KSA', regionName: 'Kingston' },
  })
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('addresses', () => {
  it('lists tenant-scoped addresses in the complete list envelope', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/addresses')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'address',
            id: 'addr_1',
            tenant_id: 'ten_1',
            name: 'Kingston office',
            line1: '1 Harbour Street',
            line2: null,
            city: 'Kingston',
            region_code: 'KSA',
            region_name: 'Kingston',
            country_code: 'JM',
            postal_code: 'JMKN01',
            latitude: 18,
            longitude: -76.8,
            is_active: true,
            created_at: NOW - 10,
            updated_at: NOW,
          },
        ],
        has_more: false,
        url: '/v1/tenants/ten_1/addresses',
        total_count: null,
      },
      error: null,
    })
    expect(address.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 26,
    })
  })

  it('creates an address with its server-resolved geographic snapshot', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/addresses')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Kingston office',
        line1: '1 Harbour Street',
        city: 'Kingston',
        country_code: 'jm',
        region_code: 'ksa',
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: expect.objectContaining({ object: 'address', id: 'addr_1' }),
      error: null,
    })
    expect(resolveRegion).toHaveBeenCalledWith('JM', 'KSA')
    expect(address.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_1',
        name: 'Kingston office',
        line1: '1 Harbour Street',
        line2: null,
        city: 'Kingston',
        countryCode: 'JM',
        regionCode: 'KSA',
        regionName: 'Kingston',
        postalCode: null,
        latitude: null,
        longitude: null,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    })
  })

  it('refuses to delete an address which still has an owner', async () => {
    address.findFirst.mockResolvedValue({
      id: 'addr_1',
      _count: { branches: 1, warehouses: 0, customerAddresses: 0 },
    })

    const response = await request(createApp())
      .delete('/v1/tenants/ten_1/addresses/addr_1')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'address/in-use',
        message: 'This address is still in use.',
      },
    })
    expect(address.delete).not.toHaveBeenCalled()
  })

  it('requires the admin credential before reading addresses', async () => {
    const response = await request(createApp()).get(
      '/v1/tenants/ten_1/addresses'
    )

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'api-key/missing', message: 'An API key is required.' },
    })
    expect(address.findMany).not.toHaveBeenCalled()
  })

  it('rejects an unpaired coordinate before resolving or writing', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/addresses')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Kingston office',
        line1: '1 Harbour Street',
        city: 'Kingston',
        country_code: 'JM',
        latitude: 18,
      })

    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'request/invalid',
        message: 'Provide both a latitude and a longitude, or neither.',
      },
    })
    expect(resolveRegion).not.toHaveBeenCalled()
    expect(address.create).not.toHaveBeenCalled()
  })

  describe('Advanced guides — realistic data, contract and chaos (1.6, 2.10, 2.11)', () => {
    it('When realistic international data is posted, then trims and normalizes and returns BDD envelope', async () => {
      // Arrange — realistic Jamaican address with mixed case and whitespace
      const realistic = {
        name: '  Café Mocha — Kingston Wharf  ',
        line1: '  7 Harbour Street, 2nd Floor ',
        city: '  St. Andrew  ',
        country_code: ' jm ',
        region_code: ' ksa ',
        postal_code: ' JMKN05 ',
      }

      // Act
      const response = await request(createApp())
        .post('/v1/tenants/ten_1/addresses')
        .set(ADMIN_HEADERS)
        .send(realistic)

      // Assert — declarative BDD, schema with dynamic fields
      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        data: {
          object: 'address',
          id: expect.any(String),
          created_at: expect.any(Number),
          updated_at: expect.any(Number),
        },
        error: null,
      })
      expect(address.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            countryCode: 'JM',
            regionCode: 'KSA',
          }),
        })
      )
    })

    it('When malformed payload with oversized or empty fields is sent, then 422 without leaking internals', async () => {
      // Arrange — only payloads that must fail validation (>121, empty)
      const mustFail = [
        {
          name: 'a'.repeat(121),
          line1: '1 Harbour',
          city: 'Kingston',
          country_code: 'JM',
        },
        { name: '', line1: '1 Harbour', city: 'Kingston', country_code: 'JM' },
      ]

      for (const p of mustFail) {
        // Act
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/addresses')
          .set(ADMIN_HEADERS)
          .send(p)

        // Assert — no 500, error envelope strictly shaped
        expect([400, 422]).toContain(res.status)
        expect(res.body).toEqual({
          data: null,
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
          }),
        })
        expect(res.body.error).not.toHaveProperty('stack')
      }
    })

    it('When XSS/SQL-like strings are sent in allowed fields, then API handles without 500 or stack leak', async () => {
      // Arrange — these strings are valid length but historically risky; API should not crash
      const risky = [
        {
          name: "<script>alert('xss')</script>",
          line1: '1 Harbour',
          city: 'Kingston',
          country_code: 'JM',
        },
        {
          name: "' OR '1'='1",
          line1: '../etc/passwd',
          city: 'Kingston',
          country_code: 'JM',
        },
      ]

      for (const p of risky) {
        // Act
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/addresses')
          .set(ADMIN_HEADERS)
          .send(p)

        // Assert — either accepted (201) or rejected (422) but never 500/stack
        expect([201, 400, 422]).toContain(res.status)
        if (res.status !== 201) {
          expect(res.body.error).not.toHaveProperty('stack')
        } else {
          expect(res.body.data).toHaveProperty('object', 'address')
        }
      }
    })

    it('When geographic service is unavailable, then 503 and does not write', async () => {
      // Arrange
      resolveRegion.mockResolvedValueOnce({
        ok: false,
        code: 'address/geography-unavailable',
      })

      // Act
      const response = await request(createApp())
        .post('/v1/tenants/ten_1/addresses')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Offline Geo',
          line1: '1 Harbour',
          city: 'Kingston',
          country_code: 'JM',
          region_code: 'KSA',
        })

      // Assert
      expect(response.status).toBe(503)
      expect(response.body.error.code).toBe('address/geography-unavailable')
      expect(address.create).not.toHaveBeenCalled()
    })

    it('When listing addresses, then every item satisfies public contract schema', async () => {
      // Arrange — per-test data isolation, no global seed
      const row = addressRow({ id: 'addr_real_1', name: 'Real Address 1' })
      address.findMany.mockResolvedValueOnce([row])

      // Act
      const res = await request(createApp())
        .get('/v1/tenants/ten_1/addresses')
        .set(ADMIN_HEADERS)

      // Assert — black-box: only public fields, types, no internal leakage
      expect(res.status).toBe(200)
      expect(res.body.data.data[0]).toMatchObject({
        object: 'address',
        id: expect.any(String),
        tenant_id: expect.any(String),
        created_at: expect.any(Number),
        country_code: expect.any(String),
      })
      expect(res.body.data.data[0]).not.toHaveProperty('tenantId')
      expect(res.body.data.data[0]).not.toHaveProperty('regionCode')
    })
  })
})
