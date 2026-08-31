import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  provisioningSetup,
  provisioningManifest,
  provisioningManifestRevision,
  provisioningResource,
  provisioningProperty,
  provisioningStep,
  organization,
  apiKey,
  $transaction,
} = vi.hoisted(() => ({
  provisioningSetup: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  provisioningManifest: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  provisioningManifestRevision: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  provisioningResource: { create: vi.fn(), deleteMany: vi.fn() },
  provisioningProperty: { create: vi.fn() },
  provisioningStep: { create: vi.fn(), deleteMany: vi.fn() },
  organization: { count: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    provisioningSetup,
    provisioningManifest,
    provisioningManifestRevision,
    provisioningResource,
    provisioningProperty,
    provisioningStep,
    organization,
    apiKey,
    $transaction,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/application')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function setupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'psu_jamaica',
    key: 'jamaica',
    name: 'Jamaica',
    description: 'Jamaican dollar and the standard GCT rate.',
    countryCode: 'JM',
    currencyCode: 'JMD',
    status: 'active',
    isDefault: true,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function publishedRevisionRow() {
  return {
    id: 'pmr_jamaica',
    manifestId: 'pm_jamaica',
    revision: 1,
    status: 'published',
    reconciliation: 'create_missing',
    preserveTenantOverrides: true,
    financeDependency: 'none',
    financeScopes: [],
    publishedAt: BigInt(NOW),
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    provisioningResources: [
      {
        id: 'prs_1',
        resourceType: 'workspace',
        key: 'default',
        position: 0,
        provisioningProperties: [
          {
            id: 'prp_1',
            key: 'countryCode',
            valueType: 'reference',
            stringValue: null,
            integerValue: null,
            decimalValue: null,
            booleanValue: null,
            referenceNamespace: 'country',
            referenceKey: 'JM',
          },
        ],
      },
    ],
    provisioningSteps: [
      {
        id: 'pst_1',
        key: 'workspace',
        description: 'Create the finance workspace.',
        position: 0,
      },
    ],
  }
}

function emptyDraftRow(targetKey = 'new-zealand') {
  return {
    id: 'pmr_nz',
    manifestId: 'pm_nz',
    revision: 1,
    status: 'draft',
    reconciliation: 'create_missing',
    preserveTenantOverrides: true,
    financeDependency: 'none',
    financeScopes: [],
    publishedAt: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    provisioningResources: [],
    provisioningSteps: [],
    provisioningManifest: { targetKey },
  }
}

function configureBlankDraftPersistence(targetKey = 'new-zealand') {
  const manifest = {
    id: 'pm_nz',
    targetType: 'finance',
    targetKey,
    manifestVersion: 1,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
  }
  provisioningManifest.findFirst.mockResolvedValue(null)
  provisioningManifest.create.mockResolvedValue(manifest)
  provisioningManifestRevision.findFirst
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
  provisioningManifestRevision.create.mockResolvedValue(emptyDraftRow(targetKey))
  provisioningManifestRevision.findUnique.mockResolvedValue(
    emptyDraftRow(targetKey)
  )
  provisioningManifest.update.mockResolvedValue(manifest)
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_1',
    status: 'active',
    revokedAt: null,
    expiresAt: null,
    keyHash: null,
  })
  provisioningSetup.findMany.mockResolvedValue([])
  provisioningSetup.findFirst.mockResolvedValue(null)
  provisioningManifestRevision.findMany.mockResolvedValue([])
  provisioningManifestRevision.findFirst.mockResolvedValue(null)
  organization.count.mockResolvedValue(0)
})

describe('GET /provisioning/setups', () => {
  it('returns every setup with its manifest target and usage count', async () => {
    provisioningSetup.findMany.mockResolvedValue([setupRow()])
    provisioningManifestRevision.findMany.mockResolvedValue([
      {
        revision: 3,
        status: 'published',
        provisioningManifest: { targetKey: 'jamaica' },
      },
      {
        revision: 4,
        status: 'draft',
        provisioningManifest: { targetKey: 'jamaica' },
      },
    ])
    organization.count.mockResolvedValue(7)

    const response = await request(createApp())
      .get('/provisioning/setups')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data).toEqual({
      object: 'list',
      data: [
        {
          object: 'provisioning_setup',
          id: 'psu_jamaica',
          key: 'jamaica',
          name: 'Jamaica',
          description: 'Jamaican dollar and the standard GCT rate.',
          country_code: 'JM',
          currency_code: 'JMD',
          status: 'active',
          is_default: true,
          manifest_target: 'finance/jamaica',
          published_revision: 3,
          has_draft: true,
          organization_count: 7,
          created_at: NOW,
          updated_at: NOW,
        },
      ],
      has_more: false,
      url: '/provisioning/setups',
      total_count: 1,
    })
  })
})

describe('GET /provisioning/setups/:setup_key', () => {
  it('returns 404 with a stable code for an unknown setup', async () => {
    const response = await request(createApp())
      .get('/provisioning/setups/atlantis')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('provisioning/setup-not-found')
    expect(response.body.error).not.toHaveProperty('httpStatus')
  })
})

describe('POST /provisioning/setups', () => {
  it('rejects a key that already exists', async () => {
    provisioningSetup.findFirst.mockResolvedValue(setupRow())

    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({ key: 'jamaica', name: 'Jamaica' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('provisioning/setup-key-taken')
    expect(provisioningSetup.create).not.toHaveBeenCalled()
  })

  it('creates a blank setup with an editable draft and no copied resources', async () => {
    configureBlankDraftPersistence()
    provisioningSetup.create.mockResolvedValue(
      setupRow({
        id: 'psu_nz',
        key: 'new-zealand',
        name: 'New Zealand',
        description: null,
        countryCode: null,
        currencyCode: null,
        isDefault: false,
      })
    )
    provisioningManifestRevision.findMany.mockResolvedValue([
      {
        revision: 1,
        status: 'draft',
        provisioningManifest: { targetKey: 'new-zealand' },
      },
    ])

    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({ key: 'new-zealand', name: 'New Zealand' })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      key: 'new-zealand',
      country_code: null,
      currency_code: null,
      published_revision: null,
      has_draft: true,
      is_default: false,
    })
    expect(provisioningResource.create).not.toHaveBeenCalled()
    expect(provisioningStep.create).not.toHaveBeenCalled()
    expect(provisioningManifestRevision.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'published' }),
      })
    )
  })

  it('supports an explicit copy source without forcing or publishing the copy', async () => {
    provisioningSetup.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(setupRow())
    provisioningSetup.create.mockResolvedValue(
      setupRow({
        id: 'psu_nz',
        key: 'new-zealand',
        name: 'New Zealand',
        isDefault: false,
      })
    )
    provisioningManifestRevision.findFirst
      .mockResolvedValueOnce(publishedRevisionRow())
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    provisioningManifest.findFirst.mockResolvedValue(null)
    provisioningManifest.create.mockResolvedValue({
      id: 'pm_nz',
      targetType: 'finance',
      targetKey: 'new-zealand',
      manifestVersion: 1,
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    })
    provisioningManifestRevision.create.mockResolvedValue(
      emptyDraftRow('new-zealand')
    )
    provisioningManifestRevision.findUnique.mockResolvedValue({
      ...emptyDraftRow('new-zealand'),
      provisioningResources: publishedRevisionRow().provisioningResources,
      provisioningSteps: publishedRevisionRow().provisioningSteps,
    })
    provisioningManifestRevision.findMany.mockResolvedValue([
      {
        revision: 1,
        status: 'draft',
        provisioningManifest: { targetKey: 'new-zealand' },
      },
    ])

    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({
        key: 'new-zealand',
        name: 'New Zealand',
        copy_from: 'jamaica',
      })

    expect(response.status).toBe(201)
    expect(provisioningResource.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resourceType: 'workspace',
        key: 'default',
      }),
    })
    expect(provisioningProperty.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: 'countryCode',
        valueType: 'reference',
        referenceNamespace: 'country',
        referenceKey: 'JM',
      }),
    })
    expect(response.body.data.published_revision).toBeNull()
  })

  it('refuses to create a blank setup as the platform default', async () => {
    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({
        key: 'new-zealand',
        name: 'New Zealand',
        is_default: true,
      })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('provisioning/setup-not-published')
    expect(provisioningSetup.create).not.toHaveBeenCalled()
  })
})

describe('PUT /provisioning/manifests/finance/:setup_key/draft', () => {
  it('persists a partial draft and maps API field names before Prisma writes', async () => {
    configureBlankDraftPersistence()
    provisioningManifestRevision.findUnique.mockResolvedValue({
      ...emptyDraftRow('new-zealand'),
      provisioningResources: [
        {
          id: 'prs_nzd',
          resourceType: 'currency',
          key: 'NZD',
          position: 10,
          provisioningProperties: [
            {
              id: 'prp_code',
              key: 'code',
              valueType: 'string',
              stringValue: 'NZD',
              integerValue: null,
              decimalValue: null,
              booleanValue: null,
              referenceNamespace: null,
              referenceKey: null,
            },
            {
              id: 'prp_name',
              key: 'name',
              valueType: 'string',
              stringValue: 'New Zealand Dollar',
              integerValue: null,
              decimalValue: null,
              booleanValue: null,
              referenceNamespace: null,
              referenceKey: null,
            },
            {
              id: 'prp_minor',
              key: 'minorUnit',
              valueType: 'integer',
              stringValue: null,
              integerValue: 2n,
              decimalValue: null,
              booleanValue: null,
              referenceNamespace: null,
              referenceKey: null,
            },
          ],
        },
      ],
    })

    const response = await request(createApp())
      .put('/provisioning/manifests/finance/new-zealand/draft')
      .set(AUTH)
      .send({
        manifest_version: 1,
        resources: [
          {
            resource_type: 'currency',
            key: 'NZD',
            position: 10,
            properties: [
              {
                key: 'code',
                value_type: 'string',
                string_value: 'NZD',
              },
              {
                key: 'name',
                value_type: 'string',
                string_value: 'New Zealand Dollar',
              },
              {
                key: 'minorUnit',
                value_type: 'integer',
                integer_value: 2,
              },
            ],
          },
        ],
      })

    expect(response.status).toBe(200)
    expect(provisioningResource.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resourceType: 'currency',
        key: 'NZD',
      }),
    })
    expect(provisioningProperty.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: 'minorUnit',
        valueType: 'integer',
        integerValue: 2n,
      }),
    })
  })
})

describe('POST /provisioning/setups reserved keys', () => {
  it.each(['new', 'runs'])(
    'refuses the reserved key %s that Console already routes',
    async (key) => {
      const response = await request(createApp())
        .post('/provisioning/setups')
        .set(AUTH)
        .send({ key, name: 'Reserved' })

      expect(response.status).toBe(422)
      expect(provisioningSetup.create).not.toHaveBeenCalled()
    }
  )
})

describe('PATCH /provisioning/setups/:setup_key', () => {
  it('moves the platform default onto another published setup in one transaction', async () => {
    const target = setupRow({
      id: 'psu_us',
      key: 'united-states',
      name: 'United States',
      isDefault: false,
    })
    provisioningSetup.findFirst.mockResolvedValue(target)
    provisioningManifestRevision.findFirst.mockResolvedValue(
      publishedRevisionRow()
    )
    $transaction.mockResolvedValue([
      { count: 1 },
      { ...target, isDefault: true },
    ])

    const response = await request(createApp())
      .patch('/provisioning/setups/united-states')
      .set(AUTH)
      .send({ is_default: true })

    expect(response.status).toBe(200)
    expect(response.body.data.is_default).toBe(true)
    expect($transaction).toHaveBeenCalledTimes(1)
    expect(provisioningSetup.updateMany).toHaveBeenCalledWith({
      where: { isDefault: true, NOT: { id: 'psu_us' } },
      data: { isDefault: false, updatedAt: expect.anything() },
    })
  })

  it('refuses to make an unpublished setup the platform default', async () => {
    provisioningSetup.findFirst.mockResolvedValue(
      setupRow({
        id: 'psu_nz',
        key: 'new-zealand',
        name: 'New Zealand',
        isDefault: false,
      })
    )
    provisioningManifestRevision.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/provisioning/setups/new-zealand')
      .set(AUTH)
      .send({ is_default: true })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('provisioning/setup-not-published')
    expect($transaction).not.toHaveBeenCalled()
  })

  it('refuses to archive the platform default', async () => {
    provisioningSetup.findFirst.mockResolvedValue(setupRow())

    const response = await request(createApp())
      .patch('/provisioning/setups/jamaica')
      .set(AUTH)
      .send({ status: 'archived' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('provisioning/setup-default-required')
    expect(provisioningSetup.update).not.toHaveBeenCalled()
  })

  it('refuses to archive a setup organizations are provisioned with', async () => {
    provisioningSetup.findFirst.mockResolvedValue(
      setupRow({ id: 'psu_us', key: 'united-states', isDefault: false })
    )
    organization.count.mockResolvedValue(3)

    const response = await request(createApp())
      .patch('/provisioning/setups/united-states')
      .set(AUTH)
      .send({ status: 'archived' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('provisioning/setup-in-use')
    expect(provisioningSetup.update).not.toHaveBeenCalled()
  })

  it('rejects an empty update body', async () => {
    const response = await request(createApp())
      .patch('/provisioning/setups/jamaica')
      .set(AUTH)
      .send({})

    expect(response.status).toBe(422)
    expect(provisioningSetup.update).not.toHaveBeenCalled()
  })
})
