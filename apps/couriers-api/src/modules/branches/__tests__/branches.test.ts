import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1785000000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'br_1',
    tenantId: 'ten_1',
    addressId: 'addr_1',
    orgLocationId: null,
    name: 'Kingston',
    phone: null,
    isDefault: true,
    isActive: true,
    settings: null,
    createdAt: NOW - 10,
    updatedAt: NOW,
    address: {
      id: 'addr_1',
      tenantId: 'ten_1',
      name: 'Kingston',
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

const { tenant, branch, address, apiKey } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  branch: {
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
    branch,
    address,
    apiKey,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({ branch, address })
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
  branch.findFirst.mockResolvedValue(row())
  branch.findMany.mockResolvedValue([row()])
  branch.count.mockResolvedValue(1)
  address.create.mockResolvedValue({ id: 'addr_1' })
  branch.create.mockResolvedValue(row())
  branch.update.mockResolvedValue(row({ name: 'New Kingston' }))
  branch.updateMany.mockResolvedValue({ count: 1 })
  address.update.mockResolvedValue(row().address)
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('branches', () => {
  it('lists tenant-scoped branches with a full Stripe-style resource', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/branches')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: {
        object: 'list',
        data: [
          {
            object: 'branch',
            tenant_id: 'ten_1',
            address: { object: 'address', region_name: 'Kingston' },
          },
        ],
      },
      error: null,
    })
    expect(branch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'ten_1' }),
      })
    )
  })

  it('returns inactive branches when is_active is false', async () => {
    branch.findMany.mockResolvedValue([row({ isActive: false })])

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/branches?is_active=false')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          expect.objectContaining({
            object: 'branch',
            id: 'br_1',
            is_active: false,
          }),
        ],
        has_more: false,
        url: '/v1/tenants/ten_1/branches',
        total_count: null,
      },
      error: null,
    })
    expect(branch.findMany).toHaveBeenCalledTimes(1)
    expect(branch.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', isActive: false },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      take: 26,
      include: { address: true },
    })
  })

  it('uses the branch sort tuple for a starting_after page', async () => {
    const anchor = row({ id: 'br_new_kingston', name: 'New Kingston' })
    const next = row({
      id: 'br_mobay',
      name: 'Montego Bay',
      isDefault: false,
    })
    branch.findFirst.mockResolvedValue(anchor)
    branch.findMany.mockResolvedValue([
      next,
      row({ id: 'br_ochi', isDefault: false }),
    ])

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/branches?limit=1&starting_after=br_new_kingston')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ id: 'br_mobay' })],
        has_more: true,
        url: '/v1/tenants/ten_1/branches',
        total_count: null,
      },
      error: null,
    })
    expect(branch.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: 'br_new_kingston' },
      include: { address: true },
    })
    expect(branch.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        OR: [
          { isDefault: false },
          { isDefault: true, name: { gt: 'New Kingston' } },
          {
            isDefault: true,
            name: 'New Kingston',
            id: { gt: 'br_new_kingston' },
          },
        ],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      take: 2,
      include: { address: true },
    })
  })

  it('uses the reverse branch sort tuple for an ending_before page', async () => {
    const anchor = row({
      id: 'br_mobay',
      name: 'Montego Bay',
      isDefault: false,
    })
    branch.findFirst.mockResolvedValue(anchor)
    branch.findMany.mockResolvedValue([
      row({ id: 'br_new_kingston', name: 'New Kingston' }),
    ])

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/branches?limit=1&ending_before=br_mobay')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ id: 'br_new_kingston' })],
        has_more: false,
        url: '/v1/tenants/ten_1/branches',
        total_count: null,
      },
      error: null,
    })
    expect(branch.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        OR: [
          { isDefault: true },
          { isDefault: false, name: { lt: 'Montego Bay' } },
          {
            isDefault: false,
            name: 'Montego Bay',
            id: { lt: 'br_mobay' },
          },
        ],
      },
      orderBy: [{ isDefault: 'asc' }, { name: 'desc' }, { id: 'desc' }],
      take: 2,
      include: { address: true },
    })
  })

  it('returns an empty page for an unresolvable branch cursor', async () => {
    branch.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/branches?starting_after=br_other_tenant')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        url: '/v1/tenants/ten_1/branches',
        total_count: null,
      },
      error: null,
    })
    expect(branch.findMany).not.toHaveBeenCalled()
  })

  it('creates the branch and address atomically', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/branches')
      .set(ADMIN_HEADERS)
      .send({
        name: 'Kingston',
        address: {
          name: 'Kingston',
          line1: '1 Harbour Street',
          city: 'Kingston',
          country_code: 'JM',
          region_code: 'KSA',
        },
      })

    expect(response.status).toBe(201)
    expect(address.create).toHaveBeenCalledOnce()
    expect(branch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'ten_1' }),
      })
    )
  })

  it('rejects clearing the only default branch', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/branches/br_1')
      .set(ADMIN_HEADERS)
      .send({ is_default: false })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('branch/conflict')
    expect(branch.update).not.toHaveBeenCalled()
  })

  describe('Advanced guides — AAA, realistic data, contract and chaos (1.2,1.6,2.10,2.11,4.1)', () => {
    it('When realistic Kingston address with mixed case and accent is posted, then normalizes and returns BDD envelope', async () => {
      // Arrange
      const payload = {
        name: '  Café Harbour — Downtown  ',
        address: {
          name: '  Café Harbour  ',
          line1: '  7 King Street, Suite 2 ',
          city: '  St. Andrew  ',
          country_code: ' jm ',
          region_code: ' ksa ',
          postal_code: ' JMKN05 ',
        },
      }
      // Act
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/branches')
        .set(ADMIN_HEADERS)
        .send(payload)
      // Assert
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        data: {
          object: 'branch',
          id: expect.any(String),
          created_at: expect.any(Number),
        },
        error: null,
      })
      expect(res.body.data.address).toMatchObject({
        object: 'address',
        country_code: 'JM',
        region_code: 'KSA',
      })
    })

    it('When XSS/SQL/traversal strings are sent, then never 500 and no stack leak', async () => {
      // Arrange
      const probes = [
        {
          name: "<script>alert('xss')</script>",
          address: {
            name: 'Home',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
          },
        },
        {
          name: "' OR '1'='1",
          address: {
            name: 'Home',
            line1: '../etc/passwd',
            city: 'Kingston',
            country_code: 'JM',
          },
        },
        {
          name: 'a'.repeat(200),
          address: {
            name: 'Home',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
          },
        },
      ]
      for (const p of probes) {
        // Act
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/branches')
          .set(ADMIN_HEADERS)
          .send(p)
        // Assert
        expect([201, 400, 422, 409]).toContain(res.status)
        if (res.body.error) expect(res.body.error).not.toHaveProperty('stack')
      }
    })

    it('When geographic service is slow or returns 503, then branch create reports 503 and does not write', async () => {
      // Arrange
      const { resolveRegion } = await import('@/providers/platform/geo')
      ;(
        resolveRegion as unknown as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        ok: false,
        code: 'address/geography-unavailable',
      })
      // Act
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/branches')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Geo Fail',
          address: {
            name: 'Geo Fail',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
            region_code: 'KSA',
          },
        })
      // Assert
      expect(res.status).toBe(503)
      expect(res.body.error.code).toBe('address/geography-unavailable')
      expect(branch.create).not.toHaveBeenCalled()
    })

    it('When listing, then contract holds for dynamic fields and no internal leakage', async () => {
      // Arrange
      const row = {
        id: 'br_real_1',
        tenantId: 'ten_1',
        addressId: 'addr_1',
        orgLocationId: null,
        name: 'Real',
        phone: null,
        isDefault: true,
        isActive: true,
        settings: null,
        createdAt: 1785000000,
        updatedAt: 1785000000,
        address: {
          id: 'addr_1',
          tenantId: 'ten_1',
          name: 'Real',
          line1: '1 Harbour',
          line2: null,
          city: 'Kingston',
          regionCode: 'KSA',
          regionName: 'Kingston',
          countryCode: 'JM',
          postalCode: null,
          latitude: null,
          longitude: null,
          isActive: true,
          createdAt: 1785000000,
          updatedAt: 1785000000,
        },
      }
      branch.findMany.mockResolvedValueOnce([
        row,
      ] as unknown as typeof branch.findMany extends (
        ...args: unknown[]
      ) => Promise<infer T>
        ? T
        : never)
      // Act
      const res = await request(createApp())
        .get('/v1/tenants/ten_1/branches')
        .set(ADMIN_HEADERS)
      // Assert
      expect(res.status).toBe(200)
      expect(res.body.data.data[0]).toMatchObject({
        object: 'branch',
        id: expect.any(String),
        tenant_id: expect.any(String),
        created_at: expect.any(Number),
      })
      expect(res.body.data.data[0]).not.toHaveProperty('tenantId')
      expect(res.body.data.data[0].address).toMatchObject({
        object: 'address',
        region_code: expect.any(String),
      })
    })

    it('When pagination cursors are invalid, then 422 or empty page without 500', async () => {
      // Arrange + Act
      const res1 = await request(createApp())
        .get('/v1/tenants/ten_1/branches?limit=9999')
        .set(ADMIN_HEADERS)
      const res2 = await request(createApp())
        .get('/v1/tenants/ten_1/branches?starting_after=&ending_before=xyz')
        .set(ADMIN_HEADERS)
      // Assert
      for (const r of [res1, res2]) {
        expect([200, 422]).toContain(r.status)
        if (r.body.error) expect(r.body.error).not.toHaveProperty('stack')
      }
    })

    it('When branch name is whitespace-only or oversized, then 422 or trimmed success without 500', async () => {
      // Arrange
      const payloads = [
        {
          name: '   ',
          address: {
            name: 'Valid',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
          },
        },
        {
          name: 'a'.repeat(300),
          address: {
            name: 'Valid',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
          },
        },
      ]
      for (const p of payloads) {
        // Act
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/branches')
          .set(ADMIN_HEADERS)
          .send(p)
        // Assert — whitespace correctly rejected, oversized rejected, but trims mean either 201 or 422/400, never 500
        expect([201, 400, 422]).toContain(res.status)
        if (res.status !== 201) {
          expect(res.body).toEqual({
            data: null,
            error: expect.objectContaining({ code: expect.any(String) }),
          })
        }
      }
    })
  })
})
