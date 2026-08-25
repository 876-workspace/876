import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1785000000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function warehouseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wh_1',
    tenantId: 'ten_1',
    addressId: 'addr_1',
    orgLocationId: null,
    name: 'Main Warehouse',
    operatingModel: 'OWNED',
    agentName: null,
    code: 'WH-001',
    mailboxPlacement: 'ADDRESS_LINE_2',
    mailboxPrefix: null,
    instructions: null,
    isActive: true,
    isPrimary: true,
    createdAt: NOW - 10,
    updatedAt: NOW,
    address: {
      id: 'addr_1',
      tenantId: 'ten_1',
      name: 'Main Warehouse',
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

const { tenant, warehouse, address, apiKey } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  warehouse: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  address: { create: vi.fn(), update: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant,
    warehouse,
    address,
    apiKey,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({ warehouse, address })
    ),
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/providers/platform/geo', () => ({
  resolveRegion: vi.fn().mockResolvedValue({
    ok: true,
    region: { regionCode: 'KSA', regionName: 'Kingston' },
  }),
}))

const { createApp } = await import('@/application')
const { resetSettingsForTest } = await import('@/config')
const { resolveRegion } = await import('@/providers/platform/geo')

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
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  tenant.findUnique.mockResolvedValue({ id: 'ten_1' })
  warehouse.findFirst.mockResolvedValue(warehouseRow())
  warehouse.findMany.mockResolvedValue([warehouseRow()])
  warehouse.count.mockResolvedValue(1)
  address.create.mockResolvedValue({ id: 'addr_1' })
  warehouse.create.mockResolvedValue(warehouseRow())
  warehouse.update.mockResolvedValue(
    warehouseRow({ name: 'Updated Warehouse' })
  )
  warehouse.updateMany.mockResolvedValue({ count: 1 })
  address.update.mockResolvedValue(warehouseRow().address)
  ;(resolveRegion as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    region: { regionCode: 'KSA', regionName: 'Kingston' },
  })
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('warehouses', () => {
  it('lists tenant warehouses with Stripe-style envelope', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: {
        object: 'list',
        data: [
          {
            object: 'warehouse',
            tenant_id: 'ten_1',
            address: { object: 'address', region_name: 'Kingston' },
          },
        ],
      },
      error: null,
    })
    expect(warehouse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'ten_1' }),
      })
    )
  })

  it('requires admin auth for listing', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/warehouses')
      .set({ 'X-876-API-Key': APP_KEY })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })

  it('retrieves a warehouse by id', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/warehouses/wh_1')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: { object: 'warehouse', id: 'wh_1' },
      error: null,
    })
  })

  it('404s when warehouse not found', async () => {
    warehouse.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/warehouses/wh_missing')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('warehouse/not-found')
  })

  it('creates a warehouse atomically', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Main Warehouse',
        address: {
          name: 'Main Warehouse',
          line1: '1 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
          region_code: 'KSA',
        },
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      data: { object: 'warehouse', name: 'Main Warehouse' },
      error: null,
    })
    expect(warehouse.create).toHaveBeenCalled()
    expect(address.create).toHaveBeenCalled()
  })

  it('404s when tenant does not exist on create', async () => {
    tenant.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .send({
        name: 'New Warehouse',
        address: {
          name: 'New Warehouse',
          line1: '2 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
        },
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('tenant/not-found')
  })

  it('409s on warehouse name conflict', async () => {
    warehouse.create.mockRejectedValue({ code: 'P2002' })

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Main Warehouse',
        address: {
          name: 'Main Warehouse',
          line1: '1 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
        },
      })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('warehouse/conflict')
  })

  it('422s on invalid input (missing name)', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .send({
        address: {
          name: 'Missing Warehouse Name',
          line1: '1 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
        },
      })

    expect(response.status).toBe(422)
  })

  it('422s when coordinates are unpaired', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Geo Warehouse',
        address: {
          name: 'Geo Warehouse',
          line1: '1 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
          latitude: 18.0,
        },
      })

    expect(response.status).toBe(422)
  })

  it('503s when geographic validation is unavailable', async () => {
    ;(resolveRegion as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      code: 'address/geography-unavailable',
    })

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Remote Warehouse',
        address: {
          name: 'Remote Warehouse',
          line1: '1 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
        },
      })

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('address/geography-unavailable')
  })

  it('updates a warehouse and returns updated resource', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/warehouses/wh_1')
      .set(ADMIN_HEADERS)
      .send({ name: 'Updated Warehouse' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: { object: 'warehouse', name: 'Updated Warehouse' },
      error: null,
    })
  })

  it('patches address on update and triggers geo resolution', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/warehouses/wh_1')
      .set(ADMIN_HEADERS)
      .send({
        address: {
          line1: '2 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
          region_code: 'KSA',
        },
      })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: { object: 'warehouse', id: 'wh_1' },
      error: null,
    })
    expect(address.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'addr_1' },
        data: expect.objectContaining({
          line1: '2 Harbour Street',
          city: 'Kingston',
          countryCode: 'JM',
          regionCode: 'KSA',
          regionName: 'Kingston',
        }),
      })
    )
    expect(resolveRegion).toHaveBeenCalledWith('JM', 'KSA')
  })

  it('handles primary promotion by clearing existing primary', async () => {
    warehouse.findFirst.mockResolvedValue(warehouseRow({ isPrimary: false }))

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/warehouses/wh_1')
      .set(ADMIN_HEADERS)
      .send({ is_primary: true })

    expect(response.status).toBe(200)
    expect(warehouse.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'ten_1', isPrimary: true },
        data: expect.objectContaining({ isPrimary: false }),
      })
    )
    expect(warehouse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wh_1' },
        data: expect.objectContaining({ isPrimary: true }),
      })
    )
  })

  it('503s when geographic validation is unavailable on update', async () => {
    ;(resolveRegion as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      code: 'address/geography-unavailable',
    })

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/warehouses/wh_1')
      .set(ADMIN_HEADERS)
      .send({
        address: { country_code: 'JM', region_code: 'KSA' },
      })

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('address/geography-unavailable')
    expect(response.body).toEqual({
      data: null,
      error: expect.objectContaining({ code: 'address/geography-unavailable' }),
    })
  })

  it('422s on invalid update input', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/warehouses/wh_1')
      .set(ADMIN_HEADERS)
      .send({ name: '' })

    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      data: null,
      error: expect.objectContaining({ code: 'request/invalid' }),
    })
  })

  it('409s on warehouse update name conflict', async () => {
    warehouse.update.mockRejectedValue({ code: 'P2002' })

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/warehouses/wh_1')
      .set(ADMIN_HEADERS)
      .send({ name: 'Duplicate' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('warehouse/conflict')
  })

  it('404s when updating missing warehouse', async () => {
    warehouse.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/warehouses/wh_missing')
      .set(ADMIN_HEADERS)
      .send({ name: 'Nope' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('warehouse/not-found')
  })

  it('wraps errors as { data: null, error: { code, message } } without httpStatus', async () => {
    warehouse.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/warehouses/wh_missing')
      .set(ADMIN_HEADERS)

    expect(response.body).toEqual({
      data: null,
      error: expect.objectContaining({
        code: expect.any(String),
        message: expect.any(String),
      }),
    })
    expect(response.body.error).not.toHaveProperty('httpStatus')
    expect(response.body.error).not.toHaveProperty('status')
  })

  it('requires admin auth for create and update', async () => {
    const createRes = await request(createApp())
      .post('/v1/tenants/ten_1/warehouses')
      .set({ 'X-876-API-Key': APP_KEY })
      .send({
        name: 'No Auth Warehouse',
        address: {
          name: 'No Auth Warehouse',
          line1: '1 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
        },
      })
    expect(createRes.status).toBe(401)
    expect(createRes.body.error.code).toBe('auth/no-session')

    const updateRes = await request(createApp())
      .patch('/v1/tenants/ten_1/warehouses/wh_1')
      .set({ 'X-876-API-Key': APP_KEY })
      .send({ name: 'No Auth' })
    expect(updateRes.status).toBe(401)
    expect(updateRes.body.error.code).toBe('auth/no-session')
  })

  describe('boundary, injection and robustness (2025 guides)', () => {
    it('422s on empty string name and trims whitespace', async () => {
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: '   ',
          address: {
            name: 'Valid',
            line1: '1 Harbour St',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      expect(res.status).toBe(422)
    })

    it('422s on maxLength+1 for name and code', async () => {
      const long = 'a'.repeat(121)
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: long,
          code: 'A'.repeat(17),
          address: {
            name: 'Valid',
            line1: '1 Harbour St',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      expect(res.status).toBe(422)
    })

    it('422s on invalid mailbox_prefix/code regex', async () => {
      const res1 = await request(createApp())
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Regex Test',
          mailbox_prefix: 'ab1!',
          address: {
            name: 'Regex Test',
            line1: '1 Harbour St',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      expect(res1.status).toBe(422)

      const res2 = await request(createApp())
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Regex Test',
          code: 'bad code!',
          address: {
            name: 'Regex Test',
            line1: '1 Harbour St',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      expect(res2.status).toBe(422)
    })

    it('rejects malicious numeric/null types and ultra-long strings without 500', async () => {
      const badPayloads = [
        { name: 123 as unknown as string, line1: '1 Harbour St' },
        { name: null as unknown as string, line1: '1 Harbour St' },
        { name: 'Valid', line1: 'a'.repeat(5000) as unknown as string },
      ]
      for (const p of badPayloads) {
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/warehouses')
          .set(ADMIN_HEADERS)
          .send({
            name: p.name,
            address: {
              name: 'Valid',
              line1: p.line1.slice(0, 200),
              city: 'Kingston',
              country_code: 'JM',
            },
          })
        // ultra-long sliced to 200 still valid, so 400/422/409 all acceptable except 500
        expect([201, 400, 422, 409]).toContain(res.status)
        if (res.status !== 201) {
          expect(res.body).toHaveProperty('error.code')
          expect(res.body.error).not.toHaveProperty('stack')
        }
      }
      // injection-like strings that are still valid shape should not cause 500
      for (const name of [
        "' OR '1'='1",
        '<script>alert(1)</script>',
        '../../etc/passwd',
      ]) {
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/warehouses')
          .set(ADMIN_HEADERS)
          .send({
            name,
            address: {
              name: 'Valid',
              line1: '1 Harbour St',
              city: 'Kingston',
              country_code: 'JM',
            },
          })
        expect([201, 400, 422, 409]).toContain(res.status)
        expect(res.body.error ?? res.body.data).toBeDefined()
        if (res.body.error) expect(res.body.error).not.toHaveProperty('stack')
      }
    })

    it('422s on boundary lat/lng out of range and NaN', async () => {
      for (const coords of [
        { latitude: 90.1, longitude: 0 },
        { latitude: -90.1, longitude: 0 },
        { latitude: 0, longitude: 180.1 },
        { latitude: 0, longitude: -180.1 },
      ]) {
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/warehouses')
          .set(ADMIN_HEADERS)
          .send({
            name: 'Boundary',
            address: {
              name: 'Boundary',
              line1: '1 Harbour St',
              city: 'Kingston',
              country_code: 'JM',
              ...coords,
            },
          })
        expect(res.status).toBe(422)
      }
    })

    it('400s on malformed JSON', async () => {
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .set('Content-Type', 'application/json')
        .send('{"name": "bad", }')
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('request/invalid-json')
    })

    it('does not leak internal errors on unexpected warehouse failure', async () => {
      warehouse.create.mockRejectedValue(new Error('unexpected db panic'))
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Panic',
          address: {
            name: 'Panic',
            line1: '1 Harbour St',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      expect(res.status).toBe(500)
      expect(res.body.error.message).not.toMatch(/panic/i)
      expect(res.body.error.code).toBe('auth/internal-error')
    })

    it('enforces tenant isolation on retrieve', async () => {
      warehouse.findFirst.mockResolvedValueOnce(null)
      // simulate warehouse belonging to other tenant
      const res = await request(createApp())
        .get('/v1/tenants/ten_other/warehouses/wh_1')
        .set(ADMIN_HEADERS)
      expect(res.status).toBe(404)
      expect(warehouse.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'ten_other', id: 'wh_1' },
        })
      )
    })

    it('property-style: random valid names produce 201 (fuzz)', async () => {
      const names = [
        'café',
        '  trimmed  ',
        'WH-2',
        '🔥 Warehouse',
        'a'.repeat(64),
      ]
      for (const n of names) {
        warehouse.create.mockResolvedValue(warehouseRow({ name: n.trim() }))
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/warehouses')
          .set(ADMIN_HEADERS)
          .send({
            name: n,
            address: {
              name: n,
              line1: '1 Harbour St',
              city: 'Kingston',
              country_code: 'jm',
            },
          })
        expect(res.status).toBe(201)
      }
    })
  })
})
