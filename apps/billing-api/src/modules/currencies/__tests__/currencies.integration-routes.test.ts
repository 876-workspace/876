import request from 'supertest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  listCurrencies: vi.fn(),
  createCurrency: vi.fn(),
  setDefaultCurrency: vi.fn(),
  updateCurrency: vi.fn(),
  removeCurrency: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/finance-connections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/finance-connections')>()),
  activeConnectionAuthorization: mocks.activeConnection,
}))
vi.mock('@/providers/identity', () => ({
  HttpIdentityGateway: class {
    appForApiKey = mocks.appForApiKey
  },
}))
vi.mock('../currencies.service', () => ({
  listCurrencies: mocks.listCurrencies,
  createCurrency: mocks.createCurrency,
  setDefaultCurrency: mocks.setDefaultCurrency,
  updateCurrency: mocks.updateCurrency,
  removeCurrency: mocks.removeCurrency,
}))

const base = '/api/v1/integrations/organizations/org_1/currencies'
const list = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: base,
}

function authorized(call: request.Test) {
  return call.set('x-876-api-key', '876_app_secret_couriers')
}

describe('Currency integration routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockResolvedValue({
      id: 'ten_1',
      active: true,
    })
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.currencies.read', 'billing.currencies.write']),
    })
    mocks.appForApiKey.mockResolvedValue({ id: 'app_couriers' })
    mocks.listCurrencies.mockResolvedValue(list)
    mocks.createCurrency.mockResolvedValue({
      object: 'tenant_currency',
      id: 'USD',
    })
    mocks.setDefaultCurrency.mockResolvedValue({
      object: 'tenant_currency',
      currency: 'USD',
    })
    mocks.updateCurrency.mockResolvedValue({
      object: 'tenant_currency',
      currency: 'USD',
    })
    mocks.removeCurrency.mockResolvedValue({
      object: 'tenant_currency',
      currency: 'USD',
    })
  })

  it('lists currencies through the connected app read scope', async () => {
    const response = await authorized(request(createApp()).get(base))

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: list, error: null })
    expect(mocks.listCurrencies).toHaveBeenCalledTimes(1)
    expect(mocks.listCurrencies).toHaveBeenCalledWith('ten_1', base)
  })

  it('rejects a currency list when the connection lacks the read scope', async () => {
    mocks.activeConnection.mockResolvedValue({ scopes: new Set() })

    const response = await authorized(request(createApp()).get(base))

    expect(response.status).toBe(403)
    expect(response.body.error).toMatchObject({
      code: 'billing/connection-forbidden',
    })
    expect(mocks.listCurrencies).not.toHaveBeenCalled()
  })

  it('enables a currency through the connected app write scope', async () => {
    const response = await authorized(request(createApp()).post(base)).send({
      currency: 'USD',
    })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: { object: 'tenant_currency', id: 'USD' },
      error: null,
    })
    expect(mocks.createCurrency).toHaveBeenCalledTimes(1)
    expect(mocks.createCurrency).toHaveBeenCalledWith('ten_1', {
      currency: 'USD',
    })
  })

  it('updates currency display metadata through the connected app write scope', async () => {
    const response = await authorized(
      request(createApp()).patch(`${base}/USD`)
    ).send({
      name: 'United States Dollar',
      symbol: '$',
      decimalPlaces: 2,
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    expect(mocks.updateCurrency).toHaveBeenCalledTimes(1)
    expect(mocks.updateCurrency).toHaveBeenCalledWith('ten_1', 'USD', {
      name: 'United States Dollar',
      symbol: '$',
      decimalPlaces: 2,
    })
  })

  it('disables a non-default currency through the connected app write scope', async () => {
    const response = await authorized(
      request(createApp()).delete(`${base}/USD`)
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    expect(mocks.removeCurrency).toHaveBeenCalledTimes(1)
    expect(mocks.removeCurrency).toHaveBeenCalledWith('ten_1', 'USD')
  })
})
