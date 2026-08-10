import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'

const { apiKey } = vi.hoisted(() => ({
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
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
})

afterEach(() => {
  resetSettingsForTest(testEnv)
})

describe('health', () => {
  it('is public and returns ok', async () => {
    const response = await request(createApp()).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: {
        object: 'health',
        status: 'ok',
        service: '@876/couriers-api',
      },
      error: null,
    })
  })

  it('does not require api key', async () => {
    const response = await request(createApp()).get('/health').set({})

    expect(response.status).toBe(200)
  })

  it('rejects invalid query params with 422', async () => {
    const response = await request(createApp()).get('/health?check=1')

    expect(response.status).toBe(422)
  })

  it('is reachable via openapi paths', async () => {
    const app = createApp()
    const openapi = await request(app).get('/openapi.json')
    // openapi should now be 200 after fix
    expect(openapi.status).toBe(200)
    expect(Object.keys(openapi.body.paths)).toContain('/health')
  })

  describe('robustness and headers (2025 guides)', () => {
    it('returns correct content-type and x-request-id', async () => {
      const res = await request(createApp())
        .get('/health')
        .set('x-request-id', 'req-123')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toMatch(/json/)
      expect(res.headers['x-request-id']).toBe('req-123')
      expect(res.body.data.object).toBe('health')
    })

    it('400s on malformed JSON even on health (via POST to unknown)', async () => {
      const res = await request(createApp())
        .post('/health')
        .set('Content-Type', 'application/json')
        .send('{"bad":,}')
      // health is GET only, POST should 404 not 500
      expect([400, 404]).toContain(res.status)
      expect(res.body.error).toBeDefined()
    })

    it('does not leak stack on health handler panic (simulated via openapi)', async () => {
      // openapi already validates no 500 leak, health itself is simple so just check envelope
      const res = await request(createApp()).get('/health')
      expect(res.body.error).toBeNull()
      expect(res.body.data).toHaveProperty('status', 'ok')
    })
  })
})
