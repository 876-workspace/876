import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const service = vi.hoisted(() => ({
  listApplicationProvisioningProfiles: vi.fn(),
  retrieveApplicationProvisioningProfile: vi.fn(),
  createApplicationProvisioningProfile: vi.fn(),
  updateApplicationProvisioningProfile: vi.fn(),
  retrieveApplicationProvisioningProfilePolicy: vi.fn(),
  replaceApplicationProvisioningProfilePolicy: vi.fn(),
  retrieveApplicationProvisioningProfileManifest: vi.fn(),
  retrieveApplicationProvisioningProfilePublished: vi.fn(),
  validateApplicationProvisioningProfileDraft: vi.fn(),
  replaceApplicationProvisioningProfileDraft: vi.fn(),
  publishApplicationProvisioningProfileDraft: vi.fn(),
}))

const { apiKey } = vi.hoisted(() => ({
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../application-provisioning-profile.service', () => service)
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

function condition() {
  return {
    object: 'application_provisioning_profile_condition' as const,
    id: 'appc_jm',
    group_key: 'jamaica',
    field: 'setup' as const,
    operator: 'equals' as const,
    value: 'jamaica',
    priority: 100,
    created_at: 1_788_163_200,
    updated_at: 1_788_163_200,
  }
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    object: 'application_provisioning_profile' as const,
    id: 'apppr_jamaica',
    app_id: 'rap_crm',
    app_slug: '876-crm',
    key: 'jamaica',
    name: 'Jamaica',
    description: 'Jamaica CRM defaults.',
    status: 'active' as const,
    is_default: false,
    manifest_target: 'application/876-crm/profiles/jamaica',
    published_revision: 2,
    has_draft: false,
    selection_count: 4,
    conditions: [condition()],
    created_at: 1_788_163_200,
    updated_at: 1_788_163_200,
    ...overrides,
  }
}

function policy() {
  return {
    object: 'application_provisioning_profile_policy' as const,
    app_id: 'rap_crm',
    app_slug: '876-crm',
    profile_id: 'apppr_jamaica',
    profile_key: 'jamaica',
    conditions: [condition()],
    updated_at: 1_788_163_200,
  }
}

function revision(status: 'draft' | 'published' = 'published') {
  return {
    object: 'provisioning_manifest_revision' as const,
    id: 'pmr_crm_jm_2',
    manifest_id: 'pm_crm_jm',
    manifest_version: 1 as const,
    revision: 2,
    status,
    reconciliation: 'create_missing' as const,
    preserve_tenant_overrides: true,
    finance_dependency: 'none' as const,
    finance_scopes: [],
    resources: [],
    steps: [],
    published_at: status === 'published' ? 1_788_163_200 : null,
    created_at: 1_788_163_200,
    updated_at: 1_788_163_200,
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

describe('application provisioning profile routes', () => {
  it('lists profiles through the assembled Express app', async () => {
    service.listApplicationProvisioningProfiles.mockResolvedValue([
      profile({ is_default: true, key: 'default', name: 'Default' }),
      profile(),
    ])

    const response = await request(createApp())
      .get('/provisioning/apps/876-crm/profiles')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(service.listApplicationProvisioningProfiles).toHaveBeenCalledWith(
      '876-crm'
    )
    expect(response.body.data.data).toHaveLength(2)
    expect(response.body.data.data[1]).toMatchObject({
      key: 'jamaica',
      status: 'active',
      conditions: [expect.objectContaining({ field: 'setup', value: 'jamaica' })],
    })
  })

  it('normalizes a new profile key before service execution', async () => {
    service.createApplicationProvisioningProfile.mockResolvedValue(
      profile({ status: 'draft' })
    )

    const response = await request(createApp())
      .post('/provisioning/apps/876-crm/profiles')
      .set(AUTH)
      .send({
        key: ' Jamaica Enterprise ',
        name: ' Jamaica enterprise ',
        description: ' New CRM defaults ',
        copy_from: 'default',
      })

    expect(response.status).toBe(201)
    expect(service.createApplicationProvisioningProfile).toHaveBeenCalledWith(
      '876-crm',
      {
        key: 'jamaica-enterprise',
        name: 'Jamaica enterprise',
        description: 'New CRM defaults',
        is_default: false,
        copy_from: 'default',
      }
    )
  })

  it('rejects an invalid profile key before service execution', async () => {
    const response = await request(createApp())
      .post('/provisioning/apps/876-crm/profiles')
      .set(AUTH)
      .send({ key: '!!!', name: 'Bad key' })

    expect(response.status).toBe(422)
    expect(service.createApplicationProvisioningProfile).not.toHaveBeenCalled()
  })

  it('retrieves a profile and preserves app/profile route parameters', async () => {
    service.retrieveApplicationProvisioningProfile.mockResolvedValue(profile())

    const response = await request(createApp())
      .get('/provisioning/apps/876-crm/profiles/jamaica')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(service.retrieveApplicationProvisioningProfile).toHaveBeenCalledWith(
      '876-crm',
      'jamaica'
    )
    expect(response.body.data.key).toBe('jamaica')
  })

  it('replaces an OR-of-AND routing policy after schema normalization', async () => {
    service.replaceApplicationProvisioningProfilePolicy.mockResolvedValue(
      policy()
    )

    const response = await request(createApp())
      .put('/provisioning/apps/876-crm/profiles/jamaica/policy')
      .set(AUTH)
      .send({
        conditions: [
          {
            group_key: ' Jamaica-Enterprise ',
            field: 'setup',
            value: ' JAMAICA ',
            priority: 100,
          },
          {
            group_key: ' Jamaica-Enterprise ',
            field: 'plan',
            value: ' ENTERPRISE ',
            priority: 100,
          },
          {
            group_key: 'country-jm',
            field: 'country',
            value: 'jm',
            priority: 50,
          },
        ],
      })

    expect(response.status).toBe(200)
    expect(
      service.replaceApplicationProvisioningProfilePolicy
    ).toHaveBeenCalledWith('876-crm', 'jamaica', {
      conditions: [
        {
          group_key: 'jamaica-enterprise',
          field: 'setup',
          operator: 'equals',
          value: 'jamaica',
          priority: 100,
        },
        {
          group_key: 'jamaica-enterprise',
          field: 'plan',
          operator: 'equals',
          value: 'enterprise',
          priority: 100,
        },
        {
          group_key: 'country-jm',
          field: 'country',
          operator: 'equals',
          value: 'JM',
          priority: 50,
        },
      ],
    })
  })

  it('rejects mixed priorities inside one AND group', async () => {
    const response = await request(createApp())
      .put('/provisioning/apps/876-crm/profiles/jamaica/policy')
      .set(AUTH)
      .send({
        conditions: [
          {
            group_key: 'jm-ent',
            field: 'setup',
            value: 'jamaica',
            priority: 100,
          },
          {
            group_key: 'jm-ent',
            field: 'plan',
            value: 'enterprise',
            priority: 90,
          },
        ],
      })

    expect(response.status).toBe(422)
    expect(
      service.replaceApplicationProvisioningProfilePolicy
    ).not.toHaveBeenCalled()
  })

  it('routes manifest draft validation through the selected profile', async () => {
    service.validateApplicationProvisioningProfileDraft.mockResolvedValue({
      object: 'provisioning_validation',
      valid: true,
      issues: [],
    })

    const body = {
      manifest_version: 1,
      reconciliation: 'create_missing',
      preserve_tenant_overrides: true,
      finance_dependency: 'none',
      finance_scopes: [],
      resources: [],
      steps: [],
    }

    const response = await request(createApp())
      .post('/provisioning/apps/876-crm/profiles/jamaica/validate')
      .set(AUTH)
      .send(body)

    expect(response.status).toBe(200)
    expect(
      service.validateApplicationProvisioningProfileDraft
    ).toHaveBeenCalledWith('876-crm', 'jamaica', body)
  })

  it('publishes the selected profile rather than the app singleton', async () => {
    service.publishApplicationProvisioningProfileDraft.mockResolvedValue(
      revision('published')
    )

    const response = await request(createApp())
      .post('/provisioning/apps/876-crm/profiles/jamaica/publish')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(
      service.publishApplicationProvisioningProfileDraft
    ).toHaveBeenCalledWith('876-crm', 'jamaica')
    expect(response.body.data).toMatchObject({ revision: 2, status: 'published' })
  })

  it('requires admin credentials for profile management', async () => {
    const response = await request(createApp()).get(
      '/provisioning/apps/876-crm/profiles'
    )

    expect(response.status).toBe(401)
    expect(service.listApplicationProvisioningProfiles).not.toHaveBeenCalled()
  })
})
