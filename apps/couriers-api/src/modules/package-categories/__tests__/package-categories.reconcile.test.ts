import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_789_400_000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

const { packageCategory } = vi.hoisted(() => ({
  packageCategory: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/db/client', () => ({
  prisma: { packageCategory },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
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

function categoryRow() {
  return {
    id: 'pcat_electronics',
    tenantId: 'ten_reyes',
    provisioningKey: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Tenant-customized wording.',
    icon: null,
    sortOrder: 40,
    isActive: true,
    createdAt: NOW - 100,
    updatedAt: NOW - 100,
    deletedAt: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))
  packageCategory.findFirst.mockResolvedValue(categoryRow())
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('package category reconciliation route', () => {
  it('reconciles a published provisioning revision without overwriting an existing category', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/package-categories/reconcile')
      .set(ADMIN_HEADERS)
      .send({
        revision: 7,
        categories: [
          {
            key: 'electronics',
            name: 'Electronics',
            description: 'Platform wording.',
            icon: null,
            sort_order: 40,
            is_active: true,
          },
        ],
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'package_category_reconciliation',
        revision: 7,
        reconciled: 1,
      },
      error: null,
    })
    expect(packageCategory.update).not.toHaveBeenCalled()
    expect(packageCategory.create).not.toHaveBeenCalled()
  })

  it('rejects an empty provisioning category set at the HTTP boundary', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_reyes/package-categories/reconcile')
      .set(ADMIN_HEADERS)
      .send({ revision: 7, categories: [] })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('request/invalid')
    expect(packageCategory.findFirst).not.toHaveBeenCalled()
  })
})
