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

  it('refuses to create a setup when no published manifest can seed it', async () => {
    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({ key: 'united-states', name: 'United States' })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe(
      'provisioning/setup-source-unavailable'
    )
    expect(provisioningSetup.create).not.toHaveBeenCalled()
  })

  it('copies the default setup manifest into the new setup and publishes it', async () => {
    // findSetupByKey(new key) → null, findDefaultSetup → Jamaica.
    provisioningSetup.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValue(setupRow())
    provisioningManifestRevision.findFirst
      // the published Jamaica revision that seeds the copy
      .mockResolvedValueOnce(publishedRevisionRow())
      // replaceDraft: no existing draft, no prior revision
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // retrieveDraftForUpdate → the draft just written
      .mockResolvedValueOnce({ ...publishedRevisionRow(), status: 'draft' })
      // promoteDraft: no currently published revision for the new manifest
      .mockResolvedValue(null)
    const usManifest = {
      id: 'pm_us',
      targetType: 'finance',
      targetKey: 'united-states',
      manifestVersion: 1,
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    }
    // The manifest does not exist yet, then exists for every later lookup.
    provisioningManifest.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValue(usManifest)
    provisioningManifest.create.mockResolvedValue({
      id: 'pm_us',
      targetType: 'finance',
      targetKey: 'united-states',
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    })
    provisioningManifestRevision.create.mockResolvedValue({
      ...publishedRevisionRow(),
      id: 'pmr_us',
      status: 'draft',
    })
    provisioningManifestRevision.findUnique.mockResolvedValue({
      ...publishedRevisionRow(),
      id: 'pmr_us',
      status: 'draft',
    })
    provisioningManifestRevision.update.mockResolvedValue({
      ...publishedRevisionRow(),
      id: 'pmr_us',
    })
    provisioningSetup.create.mockResolvedValue(
      setupRow({
        id: 'psu_us',
        key: 'united-states',
        name: 'United States',
        countryCode: 'US',
        currencyCode: 'USD',
        isDefault: false,
      })
    )

    const response = await request(createApp())
      .post('/provisioning/setups')
      .set(AUTH)
      .send({
        key: 'united-states',
        name: 'United States',
        country_code: 'us',
        currency_code: 'usd',
      })

    expect(response.status).toBe(201)
    expect(response.body.data.object).toBe('provisioning_setup')
    expect(response.body.data.key).toBe('united-states')
    expect(response.body.data.manifest_target).toBe('finance/united-states')
    expect(provisioningSetup.create).toHaveBeenCalledTimes(1)
    expect(provisioningSetup.create.mock.calls[0]![0].data).toMatchObject({
      key: 'united-states',
      countryCode: 'US',
      currencyCode: 'USD',
      isDefault: false,
      status: 'active',
    })
    // The copied resource is written under the new manifest's draft revision.
    expect(provisioningResource.create).toHaveBeenCalledTimes(1)
    expect(provisioningStep.create).toHaveBeenCalledTimes(1)
    // …and that draft is published, so the setup can provision immediately.
    expect(provisioningManifestRevision.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'published' }),
      })
    )
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
  it('moves the platform default onto another setup in one transaction', async () => {
    const target = setupRow({
      id: 'psu_us',
      key: 'united-states',
      name: 'United States',
      isDefault: false,
    })
    provisioningSetup.findFirst.mockResolvedValue(target)
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
