import { describe, expect, it, vi } from 'vitest'

import type { BillingDashboard } from '../types/dashboard'
import type { Tenant } from '../types/tenant'
import { create876BillingServerClient } from './client'

const tenant: Tenant = {
  id: 'ten_1',
  organizationId: 'org_1',
  slug: 'gracekennedy',
  name: 'GraceKennedy Limited',
  status: 'ACTIVE',
  defaultCurrency: 'JMD',
  defaultLanguage: 'en-JM',
  createdAt: 1_788_825_600,
  updatedAt: 1_788_825_600,
}

const dashboard: BillingDashboard = {
  object: 'billing_dashboard',
  activeSubscriptions: 12,
  trialingSubscriptions: 3,
  pausedSubscriptions: 1,
  cancelledSubscriptions: 2,
  customerCount: 40,
  productCount: 5,
  recurringRevenue: [{ currency: 'JMD', mrr: '150000', arr: '1800000' }],
  draftQuoteCount: 4,
  issuedInvoiceTotals: [
    { currency: 'JMD', totalIssued: '900000', totalOutstanding: '120000' },
  ],
  salesThisMonth: [{ currency: 'JMD', netSales: '200000' }],
  receivablesOverdue: [{ currency: 'JMD', overdue: '30000' }],
}

function serverFor(payload: unknown) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(payload))
  return {
    client: create876BillingServerClient({
      internalKey: 'internal-secret',
      baseUrl: 'https://billing.example.test',
      fetch,
    }),
    fetch,
  }
}

describe('server tenants projection', () => {
  it('resolves workspaces with the exact body and internal credential', async () => {
    const { client, fetch } = serverFor({ data: [tenant], error: null })
    const params = { organizationIds: ['org_1', 'org_2'] }

    const result = await client.tenants.list(params)

    expect(result).toEqual({ data: [tenant], error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/internal/projections/tenants',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
        headers: expect.objectContaining({
          'x-internal-key': 'internal-secret',
        }),
      })
    )
  })

  it('returns the parsed workspace projection', async () => {
    const { client } = serverFor({ data: [tenant], error: null })

    const result = await client.tenants.list({ organizationIds: ['org_1'] })

    expect(result.data?.[0]).toEqual(tenant)
    expect(result.error).toBeNull()
  })

  it('surfaces a tenants failure as a value instead of throwing', async () => {
    const { client } = serverFor({
      data: null,
      error: { code: 'tenant/forbidden', message: 'Not allowed.' },
    })

    const result = await client.tenants.list({ organizationIds: ['org_1'] })

    expect(result).toEqual({
      data: null,
      error: { code: 'tenant/forbidden', message: 'Not allowed.' },
    })
  })
})

describe('server dashboard projection', () => {
  it('retrieves the dashboard at the encoded projection path', async () => {
    const { client, fetch } = serverFor({ data: dashboard, error: null })

    const result = await client.dashboard.overview('ten/1')

    expect(result).toEqual({ data: dashboard, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/internal/projections/tenants/ten%2F1/dashboard',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-internal-key': 'internal-secret',
        }),
      })
    )
  })

  it('returns the parsed dashboard with minor-unit money as strings', async () => {
    const { client } = serverFor({ data: dashboard, error: null })

    const result = await client.dashboard.overview('ten_1')

    expect(result.data).toEqual(dashboard)
    expect(result.data?.recurringRevenue[0]?.mrr).toBe('150000')
    expect(result.error).toBeNull()
  })

  it('surfaces a dashboard failure as a value instead of throwing', async () => {
    const { client } = serverFor({
      data: null,
      error: { code: 'dashboard/forbidden', message: 'Not allowed.' },
    })

    const result = await client.dashboard.overview('ten_1')

    expect(result).toEqual({
      data: null,
      error: { code: 'dashboard/forbidden', message: 'Not allowed.' },
    })
  })
})
