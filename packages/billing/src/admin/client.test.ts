import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from './client'

describe('create876AdminClient', () => {
  it('calls a versioned ensure endpoint with the server-only key', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'subscription', id: 'blsub_1' },
        error: null,
      })
    )
    const client = create876AdminClient({
      baseUrl: 'https://billing.example.test',
      internalKey: 'secret-key',
      fetch: fetchMock,
    })
    const params = {
      externalReference: 'sub_core_1',
      sourceAppId: 'rap_1',
      customerId: 'blcus_1',
      items: [{ priceEntitlementReferenceId: 'prc_core_1', quantity: 1 }],
      status: 'ACTIVE' as const,
    }

    const result = await client.subscriptions.ensure(params)

    expect(result).toEqual({
      data: { object: 'subscription', id: 'blsub_1' },
      error: null,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/admin/subscriptions/ensure',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-key': 'secret-key',
        }),
        body: JSON.stringify(params),
      })
    )
  })

  it('fails closed when no internal key is configured', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const client = create876AdminClient({
      baseUrl: 'https://billing.example.test',
      internalKey: '',
      fetch: fetchMock,
    })

    const result = await client.customers.ensure({
      organizationId: 'org_1',
      name: 'Efesto Technologies',
    })

    expect(result.error?.code).toBe('billing/admin-not-configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lists app stats with the server-only key', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ data: { object: 'list', data: [] }, error: null })
      )
    const client = create876AdminClient({
      baseUrl: 'https://billing.example.test',
      internalKey: 'secret-key',
      fetch: fetchMock,
    })

    await client.stats.apps.list()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/admin/stats/apps',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-internal-key': 'secret-key',
        }),
      })
    )
  })

  it('retrieves app stats with an encoded source app id', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          object: 'app_billing_stats',
          sourceAppId: 'rap /1',
          activeSubscriptions: 0,
          trialingSubscriptions: 0,
          canceledSubscriptions: 0,
          customerCount: 0,
          monthlyRecurringRevenue: '0',
          currency: 'USD',
          invoicedTotal: '0',
          paidTotal: '0',
          outstandingTotal: '0',
          plans: [],
        },
        error: null,
      })
    )
    const client = create876AdminClient({
      baseUrl: 'https://billing.example.test',
      internalKey: 'secret-key',
      fetch: fetchMock,
    })

    await client.stats.apps.retrieve('rap /1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/admin/stats/apps/rap%20%2F1',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('ensures a core user customer', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'customer', id: 'blcus_1' },
        error: null,
      })
    )
    const client = create876AdminClient({
      baseUrl: 'https://billing.example.test',
      internalKey: 'secret-key',
      fetch: fetchMock,
    })
    const params = {
      customerType: 'CORE_USER' as const,
      userId: 'usr_1',
      name: 'Ada Lovelace',
      email: 'ada@example.test',
    }

    await client.customers.ensure(params)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/admin/customers/ensure',
      expect.objectContaining({ body: JSON.stringify(params) })
    )
  })
})
