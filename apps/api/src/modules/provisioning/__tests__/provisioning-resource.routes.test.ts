import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const resourceService = vi.hoisted(() => ({
  listSetupResources: vi.fn(),
  createSetupResource: vi.fn(),
  retrieveSetupResource: vi.fn(),
  updateSetupResource: vi.fn(),
  deleteSetupResource: vi.fn(),
}))

const { apiKey } = vi.hoisted(() => ({
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../provisioning-resource.service', () => resourceService)
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

function currencyResource() {
  return {
    object: 'provisioning_resource' as const,
    id: 'prs_jmd',
    resource_type: 'currency',
    key: 'JMD',
    position: 10,
    properties: [
      {
        object: 'provisioning_property' as const,
        id: 'prp_code',
        key: 'code',
        value_type: 'string' as const,
        string_value: 'JMD',
        integer_value: null,
        decimal_value: null,
        boolean_value: null,
        reference_namespace: null,
        reference_key: null,
      },
      {
        object: 'provisioning_property' as const,
        id: 'prp_name',
        key: 'name',
        value_type: 'string' as const,
        string_value: 'Jamaican Dollar',
        integer_value: null,
        decimal_value: null,
        boolean_value: null,
        reference_namespace: null,
        reference_key: null,
      },
    ],
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

describe('provisioning setup resource CRUD routes', () => {
  it('lists one registered resource family through the assembled API', async () => {
    resourceService.listSetupResources.mockResolvedValue({
      object: 'list',
      data: [currencyResource()],
      has_more: false,
      url: '/provisioning/setups/jamaica/resources/currency',
      total_count: 1,
    })

    const response = await request(createApp())
      .get('/provisioning/setups/jamaica/resources/currency')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(resourceService.listSetupResources).toHaveBeenCalledWith(
      'jamaica',
      'currency'
    )
    expect(response.body.data.data).toHaveLength(1)
    expect(response.body.data.data[0].key).toBe('JMD')
  })

  it('creates a resource after validating the request body', async () => {
    resourceService.createSetupResource.mockResolvedValue(currencyResource())

    const body = {
      key: 'JMD',
      position: 10,
      properties: [
        { key: 'code', value_type: 'string', string_value: 'JMD' },
        {
          key: 'name',
          value_type: 'string',
          string_value: 'Jamaican Dollar',
        },
      ],
    }

    const response = await request(createApp())
      .post('/provisioning/setups/jamaica/resources/currency')
      .set(AUTH)
      .send(body)

    expect(response.status).toBe(201)
    expect(resourceService.createSetupResource).toHaveBeenCalledWith(
      'jamaica',
      'currency',
      expect.objectContaining({ key: 'JMD', position: 10 })
    )
    expect(response.body.data.key).toBe('JMD')
  })

  it('rejects an invalid create payload before the service is called', async () => {
    const response = await request(createApp())
      .post('/provisioning/setups/jamaica/resources/currency')
      .set(AUTH)
      .send({ key: 'JMD', position: -1 })

    expect(response.status).toBe(422)
    expect(resourceService.createSetupResource).not.toHaveBeenCalled()
  })

  it('retrieves and updates one stable resource key', async () => {
    resourceService.retrieveSetupResource.mockResolvedValue(currencyResource())
    resourceService.updateSetupResource.mockResolvedValue({
      ...currencyResource(),
      position: 20,
    })

    const retrieve = await request(createApp())
      .get('/provisioning/setups/jamaica/resources/currency/JMD')
      .set(AUTH)

    expect(retrieve.status).toBe(200)
    expect(resourceService.retrieveSetupResource).toHaveBeenCalledWith(
      'jamaica',
      'currency',
      'JMD'
    )

    const update = await request(createApp())
      .patch('/provisioning/setups/jamaica/resources/currency/JMD')
      .set(AUTH)
      .send({ position: 20 })

    expect(update.status).toBe(200)
    expect(resourceService.updateSetupResource).toHaveBeenCalledWith(
      'jamaica',
      'currency',
      'JMD',
      { position: 20 }
    )
    expect(update.body.data.position).toBe(20)
  })

  it('deletes one optional resource through the standard envelope', async () => {
    resourceService.deleteSetupResource.mockResolvedValue({
      object: 'provisioning_resource',
      resource_type: 'tax_rate',
      key: 'legacy-rate',
      deleted: true,
    })

    const response = await request(createApp())
      .delete('/provisioning/setups/jamaica/resources/tax_rate/legacy-rate')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(resourceService.deleteSetupResource).toHaveBeenCalledWith(
      'jamaica',
      'tax_rate',
      'legacy-rate'
    )
    expect(response.body.data).toMatchObject({
      resource_type: 'tax_rate',
      key: 'legacy-rate',
      deleted: true,
    })
  })
})
