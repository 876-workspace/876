import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const policyService = vi.hoisted(() => ({
  retrieveSetupPolicy: vi.fn(),
  replaceSetupPolicy: vi.fn(),
}))

const { apiKey } = vi.hoisted(() => ({
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../provisioning-setup-policy.service', () => policyService)
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

function policy() {
  return {
    object: 'provisioning_setup_policy' as const,
    setup_id: 'psu_jamaica',
    setup_key: 'jamaica',
    conditions: [
      {
        object: 'provisioning_setup_condition' as const,
        id: 'psc_jm',
        group_key: 'country-jm',
        field: 'country' as const,
        operator: 'equals' as const,
        value: 'JM',
        priority: 100,
        created_at: 1_785_000_000,
        updated_at: 1_785_000_000,
      },
    ],
    entitlements: [
      {
        object: 'provisioning_setup_entitlement' as const,
        id: 'pse_enterprise',
        target_type: 'application' as const,
        target_key: '876-enterprise',
        enabled: true,
        created_at: 1_785_000_000,
        updated_at: 1_785_000_000,
      },
      {
        object: 'provisioning_setup_entitlement' as const,
        id: 'pse_work',
        target_type: 'service' as const,
        target_key: 'work',
        enabled: true,
        created_at: 1_785_000_000,
        updated_at: 1_785_000_000,
      },
    ],
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
})

describe('provisioning setup policy routes', () => {
  it('retrieves policy through the assembled Express app', async () => {
    policyService.retrieveSetupPolicy.mockResolvedValue(policy())

    const response = await request(createApp())
      .get('/provisioning/setups/jamaica/policy')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(policyService.retrieveSetupPolicy).toHaveBeenCalledWith('jamaica')
    expect(response.body.data).toMatchObject({
      setup_key: 'jamaica',
      conditions: [expect.objectContaining({ field: 'country', value: 'JM' })],
    })
  })

  it('normalizes country conditions before passing the policy to the service', async () => {
    policyService.replaceSetupPolicy.mockResolvedValue(policy())

    const response = await request(createApp())
      .put('/provisioning/setups/jamaica/policy')
      .set(AUTH)
      .send({
        conditions: [
          {
            group_key: 'country-jm',
            field: 'country',
            value: 'jm',
            priority: 100,
          },
        ],
        entitlements: [
          {
            target_type: 'service',
            target_key: 'work',
            enabled: true,
          },
        ],
      })

    expect(response.status).toBe(200)
    expect(policyService.replaceSetupPolicy).toHaveBeenCalledWith('jamaica', {
      conditions: [
        {
          group_key: 'country-jm',
          field: 'country',
          operator: 'equals',
          value: 'JM',
          priority: 100,
        },
      ],
      entitlements: [
        { target_type: 'service', target_key: 'work', enabled: true },
      ],
    })
  })

  it('rejects unsupported country codes before service execution', async () => {
    const response = await request(createApp())
      .put('/provisioning/setups/jamaica/policy')
      .set(AUTH)
      .send({
        conditions: [
          {
            group_key: 'country-zz',
            field: 'country',
            value: 'ZZ',
            priority: 100,
          },
        ],
        entitlements: [],
      })

    expect(response.status).toBe(422)
    expect(policyService.replaceSetupPolicy).not.toHaveBeenCalled()
  })

  it('rejects duplicate entitlement targets before service execution', async () => {
    const response = await request(createApp())
      .put('/provisioning/setups/jamaica/policy')
      .set(AUTH)
      .send({
        conditions: [],
        entitlements: [
          {
            target_type: 'service',
            target_key: 'work',
            enabled: true,
          },
          {
            target_type: 'service',
            target_key: 'work',
            enabled: false,
          },
        ],
      })

    expect(response.status).toBe(422)
    expect(policyService.replaceSetupPolicy).not.toHaveBeenCalled()
  })
})
