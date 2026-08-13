import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1785000000

function tenantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ten_4qR8',
    orgId: 'org_4qR8',
    slug: 'reyes-couriers',
    name: 'Reyes Couriers',
    mailboxPrefix: 'RC',
    status: 'ACTIVE',
    createdAt: NOW - 100,
    updatedAt: NOW,
    ...overrides,
  }
}

const { tenant, apiKey } = vi.hoisted(() => ({
  tenant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant,
    apiKey,
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)({})
        : Promise.all(arg as unknown[])
    ),
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/platform/jwt', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>
  return { ...mod, verifyProviderJwt: vi.fn() }
})

const { createApp } = await import('@/app')
const { resetSettingsForTest } = await import('@/config')

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  DIRECT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  API_876_KEY: APP_KEY,
  COURIERS_INTEGRATION_KEY: 'couriers-integration-test-key',
  API_INTERNAL_KEY: 'test-internal-key',
  SENTRY_DSN: '',
}

function bearerHeaders(token = 'Bearer valid.token') {
  return { 'X-876-API-Key': APP_KEY, Authorization: token }
}

beforeEach(async () => {
  vi.clearAllMocks()
  resetSettingsForTest(testEnv)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  tenant.findUnique.mockResolvedValue(tenantRow() as never)
  const { verifyProviderJwt } = await import('@/platform/jwt')
  ;(verifyProviderJwt as ReturnType<typeof vi.fn>).mockResolvedValue({
    sub: 'user_123',
    token_use: 'access',
    realm: 'consumer',
    aud: 'app_couriers',
    org_id: 'org_4qR8',
  } as never)
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('GET /v1/me/tenant', () => {
  it('resolves the caller’s own tenant from the org claim', async () => {
    const response = await request(createApp())
      .get('/v1/me/tenant')
      .set(bearerHeaders())
    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      object: 'tenant',
      id: 'ten_4qR8',
      org_id: 'org_4qR8',
    })
  })

  it('rejects without a session', async () => {
    const response = await request(createApp())
      .get('/v1/me/tenant')
      .set({ 'X-876-API-Key': APP_KEY })
    expect(response.status).toBe(401)
  })
})
