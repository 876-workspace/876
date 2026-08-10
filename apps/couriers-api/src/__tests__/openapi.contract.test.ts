import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('@/db/client', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    branch: { findMany: vi.fn().mockResolvedValue([]) },
    warehouse: { findMany: vi.fn().mockResolvedValue([]) },
    mailbox: { findMany: vi.fn().mockResolvedValue([]) },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
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
vi.mock('@/platform/jwt', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>
  return { ...mod, verifyProviderJwt: vi.fn().mockResolvedValue(null) }
})

const { createApp } = await import('@/app')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OpenAPI contract — full coverage (goldbergyoni 2.3, 2.10)', () => {
  it('When fetching /openapi.json, then contract contains all 30+ paths and security schemes', async () => {
    // Arrange
    const app = createApp()

    // Act
    const res = await request(app).get('/openapi.json')

    // Assert — declarative BDD, contract
    expect(res.status).toBe(200)
    expect(res.body.openapi).toBe('3.1.0')
    expect(res.body.info.title).toMatch(/Couriers/)
    expect(res.body.components.securitySchemes).toHaveProperty('ApiKey')
    expect(res.body.components.securitySchemes).toHaveProperty('InternalKey')
    expect(Object.keys(res.body.paths).length).toBeGreaterThanOrEqual(30)
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/health',
        '/v1/tenants/{tenantId}/warehouses',
        '/v1/tenants/{tenantId}/roles',
      ])
    )
  })

  it('When requesting health, then response satisfies contract with dynamic fields and headers', async () => {
    // Arrange
    const app = createApp()

    // Act
    const health = await request(app)
      .get('/health')
      .set('x-request-id', 'contract-123')
    const openapi = await request(app).get('/openapi.json')

    // Assert — 2.10 dynamic fields, 2.4 headers
    expect(health.status).toBe(200)
    expect(health.body).toMatchObject({
      data: {
        object: 'health',
        status: expect.any(String),
        service: expect.any(String),
      },
      error: null,
    })
    expect(health.headers['x-request-id']).toBe('contract-123')
    expect(openapi.status).toBe(200)
  })
})
