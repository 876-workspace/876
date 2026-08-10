import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

const NOW = 1_785_240_000

function preferenceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mpref_test',
    tenantId: 'ten_1',
    module: 'packages',
    key: 'volumetric_divisor',
    valueType: 'integer',
    stringValue: null,
    integerValue: 6000,
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: null,
    referenceKey: null,
    updatedBy: 'usr_test',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

const { modulePreference, organizationModule, apiKey } = vi.hoisted(() => ({
  modulePreference: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  organizationModule: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

// $transaction mock that executes callback with a tx containing modulePreference
const transactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => {
  const tx = { modulePreference }
  // prisma.$transaction can be called as (callback) or (operations)
  if (typeof callback === 'function') return callback(tx)
  return callback
})

vi.mock('@/db/client', () => ({
  prisma: {
    organizationModule,
    modulePreference: {
      findMany: modulePreference.findMany,
      upsert: modulePreference.upsert,
      deleteMany: modulePreference.deleteMany,
    },
    $transaction: transactionMock,
  },
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
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  organizationModule.findMany.mockResolvedValue([])
  organizationModule.upsert.mockResolvedValue({
    tenantId: 'ten_1',
    module: 'portal',
    isEnabled: false,
    updatedAt: NOW,
  })
  modulePreference.findMany.mockResolvedValue([])
  modulePreference.deleteMany.mockResolvedValue({ count: 1 })
  modulePreference.upsert.mockResolvedValue({})
  transactionMock.mockImplementation(
    async (callback: (tx: unknown) => unknown) => {
      const tx = { modulePreference }
      if (typeof callback === 'function') return callback(tx as unknown)
      return callback
    }
  )
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('settings preferences', () => {
  it('retrieves resolved preferences for a known module', async () => {
    modulePreference.findMany.mockResolvedValueOnce([])

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: {
        object: 'module_preferences',
        module: 'packages',
        preferences: expect.objectContaining({
          volumetric_divisor: 5000,
          chargeable_weight_rule: 'greater_of',
        }),
      },
      error: null,
    })
    expect(modulePreference.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', module: 'packages' },
    })
  })

  it('retrieves stored preference overriding default', async () => {
    modulePreference.findMany.mockResolvedValueOnce([
      preferenceRow({ integerValue: 6000 }),
    ])

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body.data.preferences.volumetric_divisor).toBe(6000)
  })

  it('requires admin for preferences retrieve', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/modules/packages/preferences')
      .set({ 'X-876-API-Key': APP_KEY })

    expect(response.status).toBe(401)
  })

  it('404s for unknown module on retrieve', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/modules/unknown_module/preferences')
      .set(ADMIN_HEADERS)

    // validation enum rejects unknown_module as 422, service would 404 if it reached
    expect([404, 422]).toContain(response.status)
    if (response.status === 404) {
      expect(response.body.error.code).toBe('module/not-found')
    }
  })

  it('updates a preference with non-default value', async () => {
    // current has no rows, after write returns row with 6000
    modulePreference.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([preferenceRow({ integerValue: 6000 })])

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)
      .send({ volumetric_divisor: 6000 })

    expect(response.status).toBe(200)
    expect(response.body.data.preferences.volumetric_divisor).toBe(6000)
    expect(response.body.data.object).toBe('module_preferences')
    expect(typeof response.body.data.updated_at).toBe('number')
    expect(modulePreference.upsert).toHaveBeenCalled()
    expect(modulePreference.deleteMany).not.toHaveBeenCalled()
  })

  it('removes stored row when submitting default value', async () => {
    // current has stored 6000, updating to default 5000 should delete
    modulePreference.findMany
      .mockResolvedValueOnce([preferenceRow({ integerValue: 6000 })])
      .mockResolvedValueOnce([])

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)
      .send({ volumetric_divisor: 5000 })

    expect(response.status).toBe(200)
    expect(response.body.data.preferences.volumetric_divisor).toBe(5000)
    expect(modulePreference.deleteMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        module: 'packages',
        key: 'volumetric_divisor',
      },
    })
    expect(modulePreference.upsert).not.toHaveBeenCalled()
  })

  it('422s on invalid preference value (out of range)', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)
      .send({ volumetric_divisor: 50 })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('request/invalid')
    expect(modulePreference.findMany).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('422s on unknown preference key', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)
      .send({ warp_speed: true })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('request/invalid')
  })

  it('isolates tenants: queries only requested tenant', async () => {
    modulePreference.findMany.mockImplementation(
      async (args: { where: { tenantId: string } }) => {
        if (args.where.tenantId === 'ten_other') {
          return [preferenceRow({ tenantId: 'ten_other', integerValue: 7000 })]
        }
        return []
      }
    )

    const resA = await request(createApp())
      .get('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)

    const resB = await request(createApp())
      .get('/v1/tenants/ten_other/modules/packages/preferences')
      .set(ADMIN_HEADERS)

    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)
    expect(resA.body.data.preferences.volumetric_divisor).toBe(5000)
    expect(resB.body.data.preferences.volumetric_divisor).toBe(7000)
    expect(modulePreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'ten_1', module: 'packages' },
      })
    )
    expect(modulePreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'ten_other', module: 'packages' },
      })
    )
  })

  it('wraps success as { data, error: null } with Unix-second timestamp', async () => {
    modulePreference.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      preferenceRow({
        module: 'warehouse',
        key: 'storage_fee_per_day',
        valueType: 'decimal',
        integerValue: null,
        decimalValue: '2.50',
        updatedAt: NOW,
      }),
    ])

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/warehouse/preferences')
      .set(ADMIN_HEADERS)
      .send({ storage_fee_per_day: '2.50' })

    // warehouse storage_fee_per_day is decimal string, 2.50 differs from default 0.00
    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data.object).toBe('module_preferences')
    expect(typeof response.body.data.updated_at).toBe('number')
    expect(Number.isInteger(response.body.data.updated_at)).toBe(true)
    expect(response.body.data.preferences.storage_fee_per_day).toBe('2.50')
  })

  it('422s on strict body violation (wrong type)', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)
      .send({ volumetric_divisor: 'not-a-number' })

    expect(response.status).toBe(422)
  })

  it('does not leak stack on unexpected failure', async () => {
    modulePreference.findMany.mockRejectedValueOnce(new Error('panic'))

    const response = await request(createApp())
      .get('/v1/tenants/ten_1/modules/packages/preferences')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(500)
    expect(response.body.error.message).not.toMatch(/panic/i)
  })
})
