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
})
