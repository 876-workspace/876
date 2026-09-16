import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository, secureField } = vi.hoisted(() => ({
  tenants: { resolveTenant: vi.fn() },
  repository: {
    listEndpoints: vi.fn(),
    listEnabledEndpoints: vi.fn(),
    retrieveEndpoint: vi.fn(),
    createEndpoint: vi.fn(),
    updateEndpoint: vi.fn(),
    removeEndpoint: vi.fn(),
    createDeliveries: vi.fn(),
    listDeliveries: vi.fn(),
    retrieveDelivery: vi.fn(),
    claimDueDeliveries: vi.fn(),
    updateDelivery: vi.fn(),
    resetDeliveryForReplay: vi.fn(),
  },
  secureField: {
    sealWebhookEndpointSecret: vi.fn(),
    unsealWebhookEndpointSecret: vi.fn(),
  },
}))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../webhooks.repository.js', () => repository)
vi.mock('../../../platform/secure-field.js', () => secureField)

const service = await import('../webhooks.service.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const sealed = { ciphertext: 'sealed', keyId: null, provider: 'local' }
const PUBLIC_URL = 'https://93.184.216.34/hook'

function endpointRow(overrides = {}) {
  return {
    id: 'whep_1',
    tenantId: tenant.id,
    url: PUBLIC_URL,
    eventTypes: ['work-item.created'],
    secret: sealed,
    enabled: true,
    consecutiveFailures: 0,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

function deliveryRow(overrides = {}) {
  return {
    id: 'whdl_1',
    tenantId: tenant.id,
    endpointId: 'whep_1',
    eventId: 'aev_1',
    attempt: 0,
    status: 'pending',
    responseCode: null,
    errorCode: null,
    nextAttemptAt: null,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

const okFetch = async () => new Response('{}', { status: 200 })
const failFetch = async () => new Response('{}', { status: 500 })

beforeEach(() => {
  vi.clearAllMocks()
  tenants.resolveTenant.mockResolvedValue(tenant)
  secureField.sealWebhookEndpointSecret.mockResolvedValue(sealed)
  secureField.unsealWebhookEndpointSecret.mockResolvedValue('endpoint-secret')
})

describe('createEndpoint', () => {
  it('returns tenant-not-found for unknown organizations', async () => {
    tenants.resolveTenant.mockResolvedValueOnce(null)
    const result = await service.createEndpoint('org_missing', {
      url: PUBLIC_URL,
      eventTypes: ['*'],
    })
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('rejects non-https urls', async () => {
    const result = await service.createEndpoint('org_1', {
      url: 'http://93.184.216.34/hook',
      eventTypes: ['*'],
    })
    expect(result.error?.code).toBe('projects/webhook-url-blocked')
  })

  it('rejects ssrf-unsafe urls', async () => {
    const result = await service.createEndpoint('org_1', {
      url: 'https://169.254.169.254/hook',
      eventTypes: ['*'],
    })
    expect(result.error?.code).toBe('projects/webhook-url-blocked')
  })

  it('seals the secret and never serializes it', async () => {
    repository.createEndpoint.mockResolvedValueOnce(endpointRow())
    const result = await service.createEndpoint('org_1', {
      url: PUBLIC_URL,
      eventTypes: ['*'],
      secret: 'sixteen-char-secret',
    })
    expect(result.error).toBeNull()
    expect(secureField.sealWebhookEndpointSecret).toHaveBeenCalledWith(
      tenant.id,
      expect.any(String),
      'sixteen-char-secret'
    )
    expect(JSON.stringify(result.data)).not.toContain('sixteen-char-secret')
    expect(result.data).toMatchObject({ object: 'projects.webhook-endpoint' })
  })
})

describe('retrieveEndpoint / updateEndpoint / removeEndpoint', () => {
  it('returns not-found for unknown endpoints', async () => {
    repository.retrieveEndpoint.mockResolvedValueOnce(null)
    const result = await service.retrieveEndpoint('org_1', 'whep_missing')
    expect(result.error?.code).toBe('projects/webhook-endpoint-not-found')
  })

  it('retrieves an endpoint', async () => {
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const result = await service.retrieveEndpoint('org_1', 'whep_1')
    expect(result.data?.id).toBe('whep_1')
  })

  it('blocks unsafe urls on update', async () => {
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const result = await service.updateEndpoint('org_1', 'whep_1', {
      url: 'https://10.0.0.1/hook',
    })
    expect(result.error?.code).toBe('projects/webhook-url-blocked')
  })

  it('resets failure counts when re-enabled', async () => {
    repository.retrieveEndpoint.mockResolvedValueOnce(
      endpointRow({ enabled: false, consecutiveFailures: 20 })
    )
    repository.updateEndpoint.mockResolvedValueOnce(
      endpointRow({ enabled: true, consecutiveFailures: 0 })
    )
    const result = await service.updateEndpoint('org_1', 'whep_1', {
      enabled: true,
    })
    expect(result.error).toBeNull()
    expect(repository.updateEndpoint).toHaveBeenCalledWith(
      'whep_1',
      expect.objectContaining({ enabled: true, consecutiveFailures: 0 })
    )
  })

  it('removes an endpoint', async () => {
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const result = await service.removeEndpoint('org_1', 'whep_1')
    expect(result.data).toEqual({
      object: 'projects.webhook-endpoint',
      id: 'whep_1',
      deleted: true,
    })
  })
})

describe('endpointMatchesEvent', () => {
  it('matches exact event types', () => {
    expect(
      service.endpointMatchesEvent(
        { enabled: true, eventTypes: ['work-item.created'] },
        'work-item.created'
      )
    ).toBe(true)
  })

  it('matches wildcards', () => {
    expect(
      service.endpointMatchesEvent(
        { enabled: true, eventTypes: ['*'] },
        'anything.happened'
      )
    ).toBe(true)
  })

  it('skips disabled endpoints and mismatches', () => {
    expect(
      service.endpointMatchesEvent(
        { enabled: false, eventTypes: ['*'] },
        'work-item.created'
      )
    ).toBe(false)
    expect(
      service.endpointMatchesEvent(
        { enabled: true, eventTypes: ['work-item.created'] },
        'work-item.deleted'
      )
    ).toBe(false)
  })
})

describe('enqueueWebhookDeliveries', () => {
  it('enqueues nothing without enabled endpoints', async () => {
    repository.listEnabledEndpoints.mockResolvedValueOnce([])
    const count = await service.enqueueWebhookDeliveries({
      id: 'aev_1',
      tenantId: tenant.id,
      type: 'work-item.created',
    })
    expect(count).toBe(0)
    expect(repository.createDeliveries).not.toHaveBeenCalled()
  })

  it('enqueues matching endpoints only', async () => {
    repository.listEnabledEndpoints.mockResolvedValueOnce([
      endpointRow({ id: 'whep_a', eventTypes: ['work-item.created'] }),
      endpointRow({ id: 'whep_b', eventTypes: ['*'] }),
      endpointRow({ id: 'whep_c', eventTypes: ['work-item.deleted'] }),
    ])
    repository.createDeliveries.mockResolvedValueOnce(2)
    const count = await service.enqueueWebhookDeliveries({
      id: 'aev_1',
      tenantId: tenant.id,
      type: 'work-item.created',
    })
    expect(count).toBe(2)
    const payload = repository.createDeliveries.mock.calls[0]?.[0] as Array<{
      endpointId: string
      eventId: string
    }>
    expect(payload.map((row) => row.endpointId).sort()).toEqual([
      'whep_a',
      'whep_b',
    ])
    expect(payload[0]?.eventId).toBe('aev_1')
  })
})

describe('drainWebhookDeliveries', () => {
  it('marks deliveries delivered and resets failures', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([
      deliveryRow(),
    ])
    repository.retrieveEndpoint.mockResolvedValueOnce(
      endpointRow({ consecutiveFailures: 3 })
    )
    const result = await service.drainWebhookDeliveries({
      fetchImpl: okFetch as unknown as typeof fetch,
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, delivered: 1 })
    expect(repository.updateDelivery).toHaveBeenCalledWith(
      'whdl_1',
      expect.objectContaining({ status: 'delivered', responseCode: 200 })
    )
    expect(repository.updateEndpoint).toHaveBeenCalledWith(
      'whep_1',
      expect.objectContaining({ consecutiveFailures: 0 })
    )
  })

  it('schedules exponential retries on bad responses', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const result = await service.drainWebhookDeliveries({
      fetchImpl: failFetch as unknown as typeof fetch,
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, scheduled: 1 })
    expect(repository.updateDelivery).toHaveBeenCalledWith(
      'whdl_1',
      expect.objectContaining({
        status: 'scheduled',
        attempt: 1,
        nextAttemptAt: 2060n,
      })
    )
  })

  it('fails deliveries after eight attempts', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([
      deliveryRow({ attempt: 7 }),
    ])
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const result = await service.drainWebhookDeliveries({
      fetchImpl: failFetch as unknown as typeof fetch,
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, failed: 1 })
    expect(repository.updateDelivery).toHaveBeenCalledWith(
      'whdl_1',
      expect.objectContaining({ status: 'failed', attempt: 8 })
    )
  })

  it('auto-disables endpoints after twenty consecutive failures', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(
      endpointRow({ consecutiveFailures: 19 })
    )
    const result = await service.drainWebhookDeliveries({
      fetchImpl: failFetch as unknown as typeof fetch,
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, disabled: 1 })
    expect(repository.updateEndpoint).toHaveBeenCalledWith(
      'whep_1',
      expect.objectContaining({ consecutiveFailures: 20, enabled: false })
    )
  })

  it('fails closed when the endpoint is gone', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(null)
    const result = await service.drainWebhookDeliveries({
      fetchImpl: okFetch as unknown as typeof fetch,
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, failed: 1 })
    expect(okFetch).toBeDefined()
  })

  it('records failures for ssrf-blocked urls without fetching', async () => {
    const fetching = vi.fn(okFetch)
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(
      endpointRow({ url: 'https://10.0.0.1/hook' })
    )
    const result = await service.drainWebhookDeliveries({
      fetchImpl: fetching as unknown as typeof fetch,
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, scheduled: 1 })
    expect(fetching).not.toHaveBeenCalled()
  })
})

describe('replayDelivery', () => {
  it('returns not-found for unknown deliveries', async () => {
    repository.retrieveDelivery.mockResolvedValueOnce(null)
    const result = await service.replayDelivery('org_1', 'whdl_missing')
    expect(result.error?.code).toBe('projects/webhook-delivery-not-found')
  })

  it('resets deliveries for replay', async () => {
    repository.retrieveDelivery.mockResolvedValueOnce(
      deliveryRow({ status: 'failed', attempt: 8 })
    )
    repository.resetDeliveryForReplay.mockResolvedValueOnce(deliveryRow())
    const result = await service.replayDelivery('org_1', 'whdl_1')
    expect(result.error).toBeNull()
    expect(repository.resetDeliveryForReplay).toHaveBeenCalledWith(
      'whdl_1',
      expect.any(BigInt)
    )
  })
})
