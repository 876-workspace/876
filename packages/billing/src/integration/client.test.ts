import { describe, expect, it, vi } from 'vitest'

import { create876BillingIntegrationClient } from './client'

const customer = {
  object: 'customer' as const,
  id: 'cus_1',
  source: null,
  customerType: 'EXTERNAL' as const,
  customerKind: 'BUSINESS' as const,
  organizationId: null,
  userId: null,
  externalReference: 'external_1',
  name: 'Acme',
  salutation: null,
  firstName: null,
  lastName: null,
  companyName: 'Acme Limited',
  email: 'billing@acme.test',
  phone: null,
  workPhone: null,
  billingAddress: null,
  metadata: null,
  defaultCurrency: 'JMD',
  language: 'en',
  outstandingReceivable: '0',
  unusedCredits: '0',
  coreSyncedAt: null,
  status: 'ACTIVE' as const,
  createdAt: 1,
  updatedAt: 1,
}

describe('create876BillingIntegrationClient', () => {
  it('uses the platform internal credential for Console customer reads', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          object: 'list',
          data: [customer],
          has_more: false,
          total_count: 1,
          url: '/api/v1/integrations/organizations/org_1/customers',
        },
        error: null,
      })
    )
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      internalKey: 'service-secret',
      requestId: 'request_1',
      fetch: fetchMock,
    })

    const result = await client.customers.list('org_1', {
      limit: 25,
      starting_after: 'cus_previous',
      status: 'ACTIVE',
      user_id: 'usr_1',
    })

    expect(result.data?.data).toEqual([customer])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/integrations/organizations/org_1/customers?limit=25&starting_after=cus_previous&status=ACTIVE&user_id=usr_1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-internal-key': 'service-secret',
          'x-request-id': 'request_1',
        }),
      })
    )
  })

  it('uses a delegated OAuth token without sending the service key', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: customer, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      accessToken: 'oauth-access-token',
      fetch: fetchMock,
    })

    await client.customers.retrieve('org_1', 'cus_1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/integrations/organizations/org_1/customers/cus_1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer oauth-access-token',
        }),
      })
    )
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      'x-internal-key'
    )
  })

  it('uses a product app API key without sending platform credentials', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: customer, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      apiKey: '876_app_secret_couriers',
      fetch: fetchMock,
    })

    await client.customers.retrieve('org_1', 'cus_1')

    const headers = fetchMock.mock.calls[0]?.[1]?.headers
    expect(headers).toMatchObject({
      'x-876-api-key': '876_app_secret_couriers',
    })
    expect(headers).not.toHaveProperty('Authorization')
    expect(headers).not.toHaveProperty('x-internal-key')
  })

  it('fails closed before making a request when no integration credential exists', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.customers.list('org_1')

    expect(result.error?.code).toBe('billing/integration-not-configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('encodes path parameters and sends the supplied customer payload unchanged', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: customer, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      internalKey: 'service-secret',
      fetch: fetchMock,
    })
    const params = { name: 'Ada Lovelace', email: 'ada@example.test' }

    await client.customers.create('org/with space', params, {
      idempotencyKey: 'create-customer-1',
    })
    await client.customers.update('org_1', 'cus/with space', {
      status: 'ARCHIVED',
    })
    await client.customers.delete('org_1', 'cus/with space')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://billing.example.test/api/v1/integrations/organizations/org%2Fwith%20space/customers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
        headers: expect.objectContaining({
          'Idempotency-Key': 'create-customer-1',
        }),
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://billing.example.test/api/v1/integrations/organizations/org_1/customers/cus%2Fwith%20space',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'ARCHIVED' }),
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://billing.example.test/api/v1/integrations/organizations/org_1/customers/cus%2Fwith%20space',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('rejects payloads that do not conform to the public integration contract', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { id: 'cus_1' }, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      internalKey: 'service-secret',
      fetch: fetchMock,
    })

    const result = await client.customers.retrieve('org_1', 'cus_1')

    expect(result.error?.code).toBe('billing/invalid-response')
    expect(result.data).toBeNull()
  })

  it('sends idempotency keys for every source-attributed create resource', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: customer, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      apiKey: '876_app_secret_couriers',
      fetch: fetchMock,
    })

    await client.items.create(
      'org_1',
      { type: 'SERVICE', name: 'Delivery' },
      { idempotencyKey: 'item_1' }
    )
    await client.invoices.create(
      'org_1',
      {
        customerId: 'cus_1',
        lines: [{ description: 'Delivery', unitAmount: 1000 }],
      },
      { idempotencyKey: 'invoice_1' }
    )
    await client.payments.create(
      'org_1',
      {
        customerId: 'cus_1',
        paymentModeId: 'pm_1',
        depositAccountId: 'ba_1',
        amount: 1000,
        currency: 'JMD',
        paymentDate: 1,
      },
      { idempotencyKey: 'payment_1' }
    )

    expect(fetchMock.mock.calls.map((call) => call[1]?.headers)).toEqual([
      expect.objectContaining({ 'Idempotency-Key': 'item_1' }),
      expect.objectContaining({ 'Idempotency-Key': 'invoice_1' }),
      expect.objectContaining({ 'Idempotency-Key': 'payment_1' }),
    ])
  })

  it('lists shared payment choices without using app-local settings', async () => {
    const paymentMode = {
      object: 'payment_mode' as const,
      id: 'pm_1',
      name: 'Cash',
      isDefault: true,
      isActive: true,
      isSystem: true,
      createdAt: 1,
      updatedAt: 1,
    }
    const bankAccount = {
      object: 'bank_account' as const,
      id: 'ba_1',
      name: 'Undeposited funds',
      accountType: 'UNDEPOSITED_FUNDS',
      currency: 'JMD',
      description: null,
      isActive: true,
      createdAt: 1,
      updatedAt: 1,
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            object: 'list',
            data: [paymentMode],
            has_more: false,
            total_count: 1,
            url: '/api/v1/integrations/organizations/org_1/payment-modes',
          },
          error: null,
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            object: 'list',
            data: [bankAccount],
            has_more: false,
            total_count: 1,
            url: '/api/v1/integrations/organizations/org_1/bank-accounts',
          },
          error: null,
        })
      )
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      apiKey: '876_app_secret_couriers',
      fetch: fetchMock,
    })

    await expect(client.paymentModes.list('org_1')).resolves.toMatchObject({
      data: { data: [paymentMode] },
      error: null,
    })
    await expect(client.bankAccounts.list('org_1')).resolves.toMatchObject({
      data: { data: [bankAccount] },
      error: null,
    })

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://billing.example.test/api/v1/integrations/organizations/org_1/payment-modes',
      'https://billing.example.test/api/v1/integrations/organizations/org_1/bank-accounts',
    ])
  })
})
