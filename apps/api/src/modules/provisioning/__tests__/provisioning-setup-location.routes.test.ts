import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const provisioningService = vi.hoisted(() => ({
  createSetup: vi.fn(),
  updateSetup: vi.fn(),
}))

const { apiKey } = vi.hoisted(() => ({
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../provisioning.service', () => provisioningService)
vi.mock('@/db/client', () => ({
  prisma: { apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/application')

const AUTH = {
  'X-876-API-Key': '876_app_secret_kQ8vN2xLpR7wT4mB',
  'x-internal-key': 'test-internal-key',
}

function setup() {
  return {
    object: 'provisioning_setup' as const,
    id: 'psu_jamaica',
    key: 'jamaica',
    name: 'Jamaica',
    description: null,
    country_code: null,
    currency_code: null,
    status: 'active' as const,
    is_default: false,
    manifest_target: 'finance/jamaica',
    published_revision: null,
    has_draft: true,
    organization_count: 0,
    created_at: 1_785_000_000,
    updated_at: 1_785_000_000,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_1',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue(undefined)
  provisioningService.createSetup.mockResolvedValue(setup())
  provisioningService.updateSetup.mockResolvedValue(setup())
})

describe('legacy provisioning setup location compatibility fields', () => {
  it('allows clean setup creation without location columns', async () => {
    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({ key: 'jamaica', name: 'Jamaica' })

    expect(response.status).toBe(201)
    expect(provisioningService.createSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'jamaica',
        name: 'Jamaica',
        country_code: null,
        currency_code: null,
      })
    )
  })

  it('rejects country_code writes because matching belongs to setup policy', async () => {
    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({ key: 'jamaica', name: 'Jamaica', country_code: 'JM' })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe(
      'provisioning/setup-location-read-only'
    )
    expect(provisioningService.createSetup).not.toHaveBeenCalled()
  })

  it('rejects currency_code writes because currency belongs to the finance manifest', async () => {
    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({ key: 'jamaica', name: 'Jamaica', currency_code: 'JMD' })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe(
      'provisioning/setup-location-read-only'
    )
    expect(provisioningService.createSetup).not.toHaveBeenCalled()
  })

  it('rejects legacy location fields on update even when callers try to clear them', async () => {
    const response = await request(createApp())
      .patch('/provisioning/setups/jamaica')
      .set(AUTH)
      .send({ country_code: null })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe(
      'provisioning/setup-location-read-only'
    )
    expect(provisioningService.updateSetup).not.toHaveBeenCalled()
  })
})
