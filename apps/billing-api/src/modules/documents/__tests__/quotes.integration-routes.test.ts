import request from 'supertest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  listQuotes: vi.fn(),
  getQuote: vi.fn(),
  createQuote: vi.fn(),
  transitionQuote: vi.fn(),
  convertQuoteToInvoice: vi.fn(),
  getQuotePreferences: vi.fn(),
  updateQuotePreferences: vi.fn(),
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
vi.mock('../documents.service', () => ({
  documentsService: {
    listQuotes: mocks.listQuotes,
    getQuote: mocks.getQuote,
    createQuote: mocks.createQuote,
    transitionQuote: mocks.transitionQuote,
    convertQuoteToInvoice: mocks.convertQuoteToInvoice,
    getQuotePreferences: mocks.getQuotePreferences,
    updateQuotePreferences: mocks.updateQuotePreferences,
  },
}))

const organizationA = 'org_a'
const organizationB = 'org_b'
const base = `/api/v1/integrations/organizations/${organizationA}/quotes`
const quote = { object: 'quote', id: 'quo_123' }
const createBody = {
  customerId: 'cus_123',
  lines: [{ description: 'Consulting', unitAmount: '12500' }],
}

function authorized(call: request.Test) {
  return call.set('x-876-api-key', '876_app_secret_invoice')
}

describe('Quote integration routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockImplementation(async (organizationId) => ({
      id: organizationId === organizationA ? 'btenant_a' : 'btenant_b',
      active: true,
    }))
    mocks.activeConnection.mockImplementation(async (tenantId) =>
      tenantId === 'btenant_a'
        ? {
            scopes: new Set(['billing.quotes.read', 'billing.quotes.write']),
          }
        : null
    )
    mocks.appForApiKey.mockResolvedValue({ id: 'app_invoice' })
    mocks.listQuotes.mockResolvedValue({
      object: 'list',
      data: [quote],
      has_more: false,
      total_count: 1,
      url: base,
    })
    mocks.getQuote.mockResolvedValue(quote)
    mocks.createQuote.mockResolvedValue(quote)
    mocks.transitionQuote.mockResolvedValue(quote)
  })

  it('lists quotes with the read scope and returns the standard list envelope', async () => {
    const response = await authorized(request(createApp()).get(base))

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [quote],
        has_more: false,
        total_count: 1,
        url: base,
      },
      error: null,
    })
    expect(mocks.listQuotes).toHaveBeenCalledWith('btenant_a', undefined)
  })

  it.each(['send', 'accept', 'decline', 'cancel', 'expire'])(
    'routes %s with tenant ownership and command idempotency',
    async (action) => {
      const response = await authorized(
        request(createApp()).post(`${base}/quo_123/${action}`)
      )
        .set('Idempotency-Key', 'quote-command')
        .send({})
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ data: quote, error: null })
      expect(mocks.transitionQuote).toHaveBeenCalledWith(
        'btenant_a',
        'quo_123',
        action,
        {
          key: 'quote-command',
          requestHash: expect.any(String),
        },
        ...(action === 'accept'
          ? [
              expect.objectContaining({
                sourceAppId: 'app_invoice',
                sourceIdempotencyKey: 'quote-command',
              }),
            ]
          : [])
      )
    }
  )

  it.each([false, true])(
    'returns the conversion status without leaking replay metadata (%s)',
    async (replayed) => {
      mocks.convertQuoteToInvoice.mockResolvedValue({
        object: 'invoice',
        id: 'inv_1',
        replayed,
      })
      const response = await authorized(
        request(createApp()).post(`${base}/quo_123/convert-to-invoice`)
      )
        .set('Idempotency-Key', 'conversion-key')
        .send({})
      expect(response.status).toBe(replayed ? 200 : 201)
      expect(response.body).toEqual({
        data: { object: 'invoice', id: 'inv_1' },
        error: null,
      })
      expect(mocks.convertQuoteToInvoice).toHaveBeenCalledWith(
        'btenant_a',
        'quo_123',
        expect.objectContaining({
          sourceAppId: 'app_invoice',
          sourceIdempotencyKey: 'conversion-key',
        })
      )
    }
  )

  it.each(['accept', 'expire', 'convert-to-invoice'])(
    'rejects %s without quote write scope',
    async (action) => {
      mocks.activeConnection.mockResolvedValue({
        scopes: new Set(['billing.quotes.read']),
      })
      const response = await authorized(
        request(createApp()).post(`${base}/quo_123/${action}`)
      ).send({})
      expect(response.status).toBe(403)
      expect(mocks.transitionQuote).not.toHaveBeenCalled()
      expect(mocks.convertQuoteToInvoice).not.toHaveBeenCalled()
    }
  )

  it('rejects nonempty command bodies before invoking the workflow', async () => {
    const response = await authorized(
      request(createApp()).post(`${base}/quo_123/accept`)
    ).send({ status: 'ACCEPTED' })
    expect(response.status).toBe(422)
    expect(mocks.transitionQuote).not.toHaveBeenCalled()
  })

  it('validates and persists the organization conversion preference', async () => {
    const preference = {
      object: 'quote-preference',
      acceptedQuoteConversion: 'draft-invoice-on-accept',
    }
    mocks.updateQuotePreferences.mockResolvedValue(preference)
    const path = `/api/v1/integrations/organizations/${organizationA}/quote-preferences`
    const response = await authorized(request(createApp()).patch(path)).send({
      acceptedQuoteConversion: 'draft-invoice-on-accept',
    })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: preference, error: null })
    expect(mocks.updateQuotePreferences).toHaveBeenCalledWith('btenant_a', {
      acceptedQuoteConversion: 'draft-invoice-on-accept',
    })
    const invalid = await authorized(request(createApp()).patch(path)).send({
      acceptedQuoteConversion: 'finalize',
    })
    expect(invalid.status).toBe(422)
    expect(mocks.updateQuotePreferences).toHaveBeenCalledOnce()
  })

  it('creates a quote with the write scope and returns a quote resource', async () => {
    const response = await authorized(request(createApp()).post(base)).send(
      createBody
    )

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: quote, error: null })
    expect(mocks.createQuote).toHaveBeenCalledWith('btenant_a', {
      customerId: 'cus_123',
      lines: [
        {
          description: 'Consulting',
          quantity: 1,
          unitAmount: 12500n,
        },
      ],
    })
  })

  it('retrieves a quote with the read scope', async () => {
    const response = await authorized(
      request(createApp()).get(`${base}/quo_123`)
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: quote, error: null })
    expect(mocks.getQuote).toHaveBeenCalledWith('btenant_a', 'quo_123')
  })

  it('refuses a quote list when the connection lacks the read scope', async () => {
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.quotes.write']),
    })

    const response = await authorized(request(createApp()).get(base))

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.listQuotes).not.toHaveBeenCalled()
  })

  it('refuses quote creation when the connection lacks the write scope', async () => {
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.quotes.read']),
    })

    const response = await authorized(request(createApp()).post(base)).send(
      createBody
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.createQuote).not.toHaveBeenCalled()
  })

  it('refuses quote retrieval when the connection lacks the read scope', async () => {
    mocks.activeConnection.mockResolvedValue({ scopes: new Set() })

    const response = await authorized(
      request(createApp()).get(`${base}/quo_123`)
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.getQuote).not.toHaveBeenCalled()
  })

  it('refuses quote creation with an invoice write scope', async () => {
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.invoices.write']),
    })

    const response = await authorized(request(createApp()).post(base)).send(
      createBody
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.createQuote).not.toHaveBeenCalled()
  })

  it('keeps an unknown quote sub-path as a 404 without evaluating authentication', async () => {
    const response = await request(createApp()).get(`${base}/quo_123/unknown`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('error/not-found')
    expect(mocks.appForApiKey).not.toHaveBeenCalled()
  })

  it('refuses listing quotes for an organization without the connection', async () => {
    const response = await authorized(
      request(createApp()).get(
        `/api/v1/integrations/organizations/${organizationB}/quotes`
      )
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.listQuotes).not.toHaveBeenCalled()
  })

  it('refuses creating a quote for an organization without the connection', async () => {
    const response = await authorized(
      request(createApp())
        .post(`/api/v1/integrations/organizations/${organizationB}/quotes`)
        .send(createBody)
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.createQuote).not.toHaveBeenCalled()
  })

  it('refuses retrieving a quote for an organization without the connection', async () => {
    const response = await authorized(
      request(createApp()).get(
        `/api/v1/integrations/organizations/${organizationB}/quotes/quo_123`
      )
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.getQuote).not.toHaveBeenCalled()
  })
})
