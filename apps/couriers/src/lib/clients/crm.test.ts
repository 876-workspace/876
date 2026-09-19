import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@876/crm/service', () => ({
  create876CrmServiceClient: vi.fn((options: unknown) => ({
    options,
    customers: { __resource: 'customers' },
    requests: { __resource: 'requests' },
    requestNotes: { __resource: 'requestNotes' },
    teams: { __resource: 'teams' },
    requestCategories: { __resource: 'requestCategories' },
    requestPriorities: { __resource: 'requestPriorities' },
    requestTasks: { __resource: 'requestTasks' },
    requestReminders: { __resource: 'requestReminders' },
    requestEvents: { __resource: 'requestEvents' },
    requestForms: { __resource: 'requestForms' },
  })),
}))

const ENV = {
  CRM_API_URL: 'http://localhost:4010',
  CRM_SERVICE_APP: '876-couriers',
  CRM_SERVICE_KEY: 'couriers-service-key',
} as const

function stubCrmEnv() {
  vi.stubEnv('CRM_API_URL', ENV.CRM_API_URL)
  vi.stubEnv('CRM_SERVICE_APP', ENV.CRM_SERVICE_APP)
  vi.stubEnv('CRM_SERVICE_KEY', ENV.CRM_SERVICE_KEY)
}

async function loadModule() {
  const service = await import('@876/crm/service')
  const crmModule = await import('./crm')
  return {
    createClient: vi.mocked(service.create876CrmServiceClient),
    crm: crmModule.crm,
  }
}

describe('couriers crm service client', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not create the client on import', async () => {
    stubCrmEnv()

    const { createClient } = await loadModule()

    expect(createClient).toHaveBeenCalledTimes(0)
  })

  it('creates the client once with the configured service credential on first resource access', async () => {
    stubCrmEnv()

    const { createClient, crm } = await loadModule()

    expect(crm.customers).toEqual({ __resource: 'customers' })
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith({
      baseUrl: ENV.CRM_API_URL,
      serviceApp: ENV.CRM_SERVICE_APP,
      serviceKey: ENV.CRM_SERVICE_KEY,
    })
  })

  it('reuses the singleton across resource accesses', async () => {
    stubCrmEnv()

    const { createClient, crm } = await loadModule()

    expect(crm.requests).toEqual({ __resource: 'requests' })
    expect(crm.teams).toEqual({ __resource: 'teams' })
    expect(crm.requests).toBe(crm.requests)
    expect(createClient).toHaveBeenCalledTimes(1)
  })

  it('exposes every resource getter from the same client', async () => {
    stubCrmEnv()

    const { createClient, crm } = await loadModule()

    expect(crm.customers).toEqual({ __resource: 'customers' })
    expect(crm.requests).toEqual({ __resource: 'requests' })
    expect(crm.requestNotes).toEqual({ __resource: 'requestNotes' })
    expect(crm.teams).toEqual({ __resource: 'teams' })
    expect(crm.requestCategories).toEqual({
      __resource: 'requestCategories',
    })
    expect(crm.requestPriorities).toEqual({
      __resource: 'requestPriorities',
    })
    expect(crm.requestTasks).toEqual({ __resource: 'requestTasks' })
    expect(crm.requestReminders).toEqual({
      __resource: 'requestReminders',
    })
    expect(crm.requestEvents).toEqual({ __resource: 'requestEvents' })
    expect(crm.requestForms).toEqual({ __resource: 'requestForms' })
    expect(createClient).toHaveBeenCalledTimes(1)
  })

  it('throws when CRM_SERVICE_APP is missing', async () => {
    stubCrmEnv()
    vi.stubEnv('CRM_SERVICE_APP', undefined)

    const { createClient, crm } = await loadModule()

    expect(() => crm.customers).toThrow('CRM_SERVICE_APP is required')
    expect(createClient).toHaveBeenCalledTimes(0)
  })

  it('throws when CRM_SERVICE_KEY is missing', async () => {
    stubCrmEnv()
    vi.stubEnv('CRM_SERVICE_KEY', undefined)

    const { createClient, crm } = await loadModule()

    expect(() => crm.requests).toThrow('CRM_SERVICE_KEY is required')
    expect(createClient).toHaveBeenCalledTimes(0)
  })

  it('throws when CRM_API_URL is missing', async () => {
    stubCrmEnv()
    vi.stubEnv('CRM_API_URL', undefined)

    const { createClient, crm } = await loadModule()

    expect(() => crm.teams).toThrow('CRM_API_URL is required')
    expect(createClient).toHaveBeenCalledTimes(0)
  })
})
