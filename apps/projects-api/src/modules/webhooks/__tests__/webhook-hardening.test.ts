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
    unsealWebhookSecret: vi.fn(),
  },
}))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../webhooks.repository.js', () => repository)
vi.mock('../../../platform/secure-field.js', () => secureField)

const service = await import('../webhooks.service.js')
const worker = await import('../../../workers/automation.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const sealed = { ciphertext: 'sealed', keyId: null, provider: 'local' }
const PUBLIC_URL = 'https://93.184.216.34/hook'

function endpointRow(overrides: Record<string, unknown> = {}) {
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

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'whdl_1',
    tenantId: tenant.id,
    endpointId: 'whep_1',
    eventId: 'aev_1',
    eventType: 'work-item.created',
    payload: {
      subjectType: 'work-item',
      subjectId: 'iss_1',
      data: { title: 'Ship' },
      createdAt: 2000,
    },
    attempt: 0,
    status: 'delivering',
    responseCode: null,
    errorCode: null,
    nextAttemptAt: null,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.resolveTenant.mockResolvedValue(tenant)
  secureField.sealWebhookEndpointSecret.mockResolvedValue(sealed)
  secureField.unsealWebhookEndpointSecret.mockResolvedValue('endpoint-secret')
  secureField.unsealWebhookSecret.mockResolvedValue('rule-secret')
})

describe('webhook event body snapshot', () => {
  it('builds the exact event body shape', () => {
    const body = service.buildWebhookEventBody(deliveryRow())
    expect(body).toEqual({
      object: 'projects.webhook-event',
      id: 'aev_1',
      type: 'work-item.created',
      createdAt: 2000,
      subject: { type: 'work-item', id: 'iss_1' },
      data: { title: 'Ship' },
      deliveryId: 'whdl_1',
      attempt: 1,
    })
  })

  it('increments the attempt number per delivery try', () => {
    const body = service.buildWebhookEventBody(deliveryRow({ attempt: 3 }))
    expect(body.attempt).toBe(4)
  })

  it('sends the snapshotted type instead of a wildcard', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const seen: Array<Record<string, unknown>> = []
    await service.drainWebhookDeliveries({
      transport: async (req) => {
        seen.push(JSON.parse(req.body))
        return { status: 200 }
      },
      nowSeconds: 2000,
    })
    expect(seen.length).toBe(1)
    const first = seen[0]
    expect(first?.type).toBe('work-item.created')
    expect(first?.object).toBe('projects.webhook-event')
    expect(first?.data).toEqual({ title: 'Ship' })
  })
})

describe('enqueue snapshots the event', () => {
  it('stores the event type and payload snapshot', async () => {
    repository.listEnabledEndpoints.mockResolvedValueOnce([
      endpointRow({ eventTypes: ['*'] }),
    ])
    repository.createDeliveries.mockResolvedValueOnce(1)
    await service.enqueueWebhookDeliveries({
      id: 'aev_9',
      tenantId: tenant.id,
      type: 'work-item.created',
      subjectType: 'work-item',
      subjectId: 'iss_9',
      payload: { title: 'Snapshot' },
      createdAt: 4242,
    })
    const rows = repository.createDeliveries.mock.calls[0]?.[0] as Array<{
      eventId: string
      eventType: string
      payload: Record<string, unknown>
    }>
    expect(rows[0]?.eventId).toBe('aev_9')
    expect(rows[0]?.eventType).toBe('work-item.created')
    expect(rows[0]?.payload).toMatchObject({
      subjectType: 'work-item',
      subjectId: 'iss_9',
      createdAt: 4242,
    })
  })
})

describe('redirects are failures without following', () => {
  it('records three-oh-one as a bad response with its status', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const transport = vi.fn(async () => ({ status: 301 }))
    const result = await service.drainWebhookDeliveries({
      transport,
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, scheduled: 1 })
    expect(transport).toHaveBeenCalledTimes(1)
    expect(repository.updateDelivery).toHaveBeenCalledWith(
      'whdl_1',
      expect.objectContaining({ responseCode: 301, status: 'scheduled' })
    )
  })

  it('records three-oh-two as a bad response with its status', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const transport = vi.fn(async () => ({ status: 302 }))
    const result = await service.drainWebhookDeliveries({
      transport,
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, scheduled: 1 })
    expect(transport).toHaveBeenCalledTimes(1)
    expect(repository.updateDelivery).toHaveBeenCalledWith(
      'whdl_1',
      expect.objectContaining({ responseCode: 302 })
    )
  })
})

describe('transport failures become scheduled retries', () => {
  it('maps timeout rejections to request failures', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const result = await service.drainWebhookDeliveries({
      transport: async () => {
        throw new Error('webhook-timeout')
      },
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, scheduled: 1 })
    expect(repository.updateDelivery).toHaveBeenCalledWith(
      'whdl_1',
      expect.objectContaining({
        status: 'scheduled',
        errorCode: 'webhook-request-failed',
      })
    )
  })

  it('maps blocked-url transport errors without a response code', async () => {
    repository.claimDueDeliveries.mockResolvedValueOnce([deliveryRow()])
    repository.retrieveEndpoint.mockResolvedValueOnce(endpointRow())
    const result = await service.drainWebhookDeliveries({
      transport: async () => {
        const err = new Error('webhook-url-blocked: blocked-address')
        throw err
      },
      nowSeconds: 2000,
    })
    expect(result).toMatchObject({ claimed: 1, scheduled: 1 })
    expect(repository.updateDelivery).toHaveBeenCalledWith(
      'whdl_1',
      expect.objectContaining({ responseCode: null })
    )
  })
})

describe('automation call-webhook ssrf guard', () => {
  it('blocks private urls without delivering', async () => {
    const outcome = await worker.executeAutomationAction(
      { type: 'call-webhook', url: 'https://10.0.0.1/hook' },
      {
        id: 'arl_1',
        tenantId: tenant.id,
        projectId: null,
        name: 'rule',
        enabled: true,
        trigger: 'work-item.created',
        conditions: [],
        actions: [],
        webhookSecret: sealed,
        createdAt: 1000n,
        updatedAt: 1000n,
      },
      {
        id: 'aev_1',
        tenantId: tenant.id,
        type: 'work-item.created',
        subjectType: 'work-item',
        subjectId: 'iss_1',
        payload: { organizationId: 'org_1' },
        causationDepth: 0,
        attempts: 0,
        claimedAt: null,
        processedAt: null,
        nextAttemptAt: null,
        createdAt: 1000n,
      },
      {
        subjectType: 'work-item',
        subjectId: 'iss_1',
        projectId: 'prj_1',
        values: {},
      },
      {
        organizationId: 'org_1',
        tenantId: tenant.id,
        ruleId: 'arl_1',
        causationDepth: 1,
      }
    )
    expect(outcome).toEqual({ ok: false, errorCode: 'automation/webhook-failed' })
  })

  it('blocks metadata urls without delivering', async () => {
    const outcome = await worker.executeAutomationAction(
      { type: 'call-webhook', url: 'https://169.254.169.254/latest' },
      {
        id: 'arl_1',
        tenantId: tenant.id,
        projectId: null,
        name: 'rule',
        enabled: true,
        trigger: 'work-item.created',
        conditions: [],
        actions: [],
        webhookSecret: sealed,
        createdAt: 1000n,
        updatedAt: 1000n,
      },
      {
        id: 'aev_1',
        tenantId: tenant.id,
        type: 'work-item.created',
        subjectType: 'work-item',
        subjectId: 'iss_1',
        payload: { organizationId: 'org_1' },
        causationDepth: 0,
        attempts: 0,
        claimedAt: null,
        processedAt: null,
        nextAttemptAt: null,
        createdAt: 1000n,
      },
      {
        subjectType: 'work-item',
        subjectId: 'iss_1',
        projectId: 'prj_1',
        values: {},
      },
      {
        organizationId: 'org_1',
        tenantId: tenant.id,
        ruleId: 'arl_1',
        causationDepth: 1,
      }
    )
    expect(outcome).toEqual({ ok: false, errorCode: 'automation/webhook-failed' })
  })
})
