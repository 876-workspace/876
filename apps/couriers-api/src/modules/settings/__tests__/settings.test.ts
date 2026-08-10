import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

const { organizationModule, apiKey } = vi.hoisted(() => ({
  organizationModule: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    organizationModule,
    apiKey,
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
    updatedAt: 1785000000,
  })
})

afterEach(() => {
  resetSettingsForTest(testEnv)
})

describe('settings', () => {
  it('lists module states with admin auth', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/modules')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: {
        object: 'list',
        data: expect.arrayContaining([
          expect.objectContaining({
            object: 'organization_module',
            module: 'general',
          }),
          expect.objectContaining({ module: 'portal' }),
        ]),
      },
      error: null,
    })
  })

  it('requires admin for modules', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/modules')
      .set({ 'X-876-API-Key': APP_KEY })

    expect(response.status).toBe(401)
  })

  it('toggles an optional module', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/portal')
      .set(ADMIN_HEADERS)
      .send({ is_enabled: false })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: {
        object: 'organization_module',
        module: 'portal',
        is_enabled: false,
      },
      error: null,
    })
  })

  it('409s when disabling a required module', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/general')
      .set(ADMIN_HEADERS)
      .send({ is_enabled: false })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('module/required')
  })

  it('404s for unknown module (validation 422)', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/unknown_module')
      .set(ADMIN_HEADERS)
      .send({ is_enabled: true })

    expect([404, 422]).toContain(response.status)
  })

  it('422s on invalid toggle body', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/modules/portal')
      .set(ADMIN_HEADERS)
      .send({ is_enabled: 'yes' })

    expect(response.status).toBe(422)
  })

  it('wraps success as { data, error: null }', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/modules')
      .set(ADMIN_HEADERS)

    expect(response.body.error).toBeNull()
    expect(response.body.data.object).toBe('list')
  })

  describe('edge and security (2025 guides)', () => {
    it('400s on malformed JSON', async () => {
      const res = await request(createApp())
        .patch('/v1/tenants/ten_1/modules/portal')
        .set(ADMIN_HEADERS)
        .set('Content-Type', 'application/json')
        .send('{"is_enabled":,}')
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('request/invalid-json')
    })

    it('422s on wrong type for is_enabled', async () => {
      for (const val of ['true', 1, null]) {
        const res = await request(createApp())
          .patch('/v1/tenants/ten_1/modules/portal')
          .set(ADMIN_HEADERS)
          .send({ is_enabled: val as unknown as boolean })
        expect(res.status).toBe(422)
      }
    })

    it('does not leak stack on unexpected toggle failure', async () => {
      organizationModule.upsert.mockRejectedValue(new Error('panic'))
      const res = await request(createApp())
        .patch('/v1/tenants/ten_1/modules/portal')
        .set(ADMIN_HEADERS)
        .send({ is_enabled: true })
      expect(res.status).toBe(500)
      expect(res.body.error.message).not.toMatch(/panic/i)
    })

    it('contract: every module has optional boolean and label', async () => {
      const res = await request(createApp())
        .get('/v1/tenants/ten_1/modules')
        .set(ADMIN_HEADERS)
      expect(res.status).toBe(200)
      for (const mod of res.body.data.data as Array<Record<string, unknown>>) {
        expect(typeof mod.optional).toBe('boolean')
        expect(typeof mod.label).toBe('string')
        expect(typeof mod.is_enabled).toBe('boolean')
        expect(mod.object).toBe('organization_module')
      }
    })
  })
})
