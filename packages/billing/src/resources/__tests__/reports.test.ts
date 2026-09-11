import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../../client'
import { create876BillingIntegrationClient } from '../../integration/client'

const baseUrl = 'https://billing.example.test'
function client(fetch: ReturnType<typeof vi.fn>) {
  return create876Client({
    baseUrl,
    fetch: fetch as unknown as typeof globalThis.fetch,
  })
}
function integration(fetch: ReturnType<typeof vi.fn>) {
  return create876BillingIntegrationClient({
    baseUrl,
    apiKey: '876_app_secret_test',
    fetch: fetch as unknown as typeof globalThis.fetch,
  })
}
function response(data: unknown) {
  return vi.fn().mockResolvedValue(Response.json({ data, error: null }))
}

const salesSummary = {
  object: 'sales-summary' as const,
  timezone: 'America/Jamaica',
  fiscalYearStartMonth: 1,
  from: 1_000,
  to: 2_000,
  groupBy: 'day' as const,
  currencies: [],
}

describe('reporting resources', () => {
  it('parses a sales summary response', async () =>
    expect(
      await client(response(salesSummary)).reports.salesSummary({
        from: 1_000,
        to: 2_000,
      })
    ).toEqual({ data: salesSummary, error: null }))

  it('sends report range filters to the sales summary path', async () => {
    const fetch = response(salesSummary)
    await client(fetch).reports.salesSummary({
      from: 1_000,
      to: 2_000,
      groupBy: 'month',
      customerId: 'cus_1',
    })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/reports/sales-summary?from=1000&to=2000&groupBy=month&customerId=cus_1`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('parses a cash summary response', async () => {
    const cash = {
      object: 'cash-summary' as const,
      timezone: 'America/Jamaica',
      fiscalYearStartMonth: 1,
      from: 1_000,
      to: 2_000,
      groupBy: 'day' as const,
      currencies: [],
    }
    expect(
      await client(response(cash)).reports.cashSummary({ from: 1_000, to: 2_000 })
    ).toEqual({ data: cash, error: null })
  })

  it('parses a receivables aging response', async () => {
    const aging = {
      object: 'receivables-aging' as const,
      timezone: 'America/Jamaica',
      asOf: 2_000,
      currencies: [],
    }
    expect(
      await client(response(aging)).reports.receivablesAging({ asOf: 2_000 })
    ).toEqual({ data: aging, error: null })
  })

  it('parses item, customer, and subscription summaries', async () => {
    const items = {
      object: 'item-sales' as const,
      timezone: 'America/Jamaica',
      from: 1_000,
      to: 2_000,
      limit: 25,
      items: [],
    }
    const customers = {
      object: 'customer-sales' as const,
      timezone: 'America/Jamaica',
      from: 1_000,
      to: 2_000,
      limit: 25,
      customers: [],
    }
    const subscriptions = {
      object: 'subscription-summary' as const,
      timezone: 'America/Jamaica',
      from: 1_000,
      to: 2_000,
      groupBy: 'month' as const,
      currencies: [],
    }
    expect(
      await client(response(items)).reports.itemSales({ from: 1_000, to: 2_000 })
    ).toEqual({ data: items, error: null })
    expect(
      await client(response(customers)).reports.customerSales({
        from: 1_000,
        to: 2_000,
      })
    ).toEqual({ data: customers, error: null })
    expect(
      await client(response(subscriptions)).reports.subscriptionSummary({
        from: 1_000,
        to: 2_000,
      })
    ).toEqual({ data: subscriptions, error: null })
  })

  it('rejects a malformed sales summary response', async () =>
    expect(
      (
        await client(response({ object: 'invoice', id: 'inv_1' })).reports.salesSummary(
          { from: 1_000, to: 2_000 }
        )
      ).error?.code
    ).toBe('billing/invalid-response'))

  it('retrieves and updates report preferences', async () => {
    const preferences = {
      object: 'report_preferences' as const,
      timezone: 'America/Jamaica',
      fiscalYearStartMonth: 1,
    }
    expect(
      await client(response(preferences)).reportPreferences.retrieve()
    ).toEqual({ data: preferences, error: null })

    const fetch = response({ ...preferences, timezone: 'America/New_York' })
    await client(fetch).reportPreferences.update({
      timezone: 'America/New_York',
    })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/report-preferences`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ timezone: 'America/New_York' }),
      })
    )
  })

  it('retrieves one item sales summary with monthly buckets', async () => {
    const summary = {
      object: 'item-sales-summary' as const,
      timezone: 'America/Jamaica',
      from: 1_000,
      to: 2_000,
      itemId: 'item_1',
      rows: [],
      monthlyBuckets: [],
    }
    const fetch = response(summary)
    expect(await client(fetch).items.salesSummary('item_1')).toEqual({
      data: summary,
      error: null,
    })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/items/item_1/sales-summary`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('serves integration reporting behind the organization path', async () => {
    const fetch = response(salesSummary)
    expect(
      await integration(fetch).reports.salesSummary('org_123', {
        from: 1_000,
        to: 2_000,
      })
    ).toEqual({ data: salesSummary, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/integrations/organizations/org_123/reports/sales-summary?from=1000&to=2000`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('serves integration report preferences behind the organization path', async () => {
    const preferences = {
      object: 'report_preferences' as const,
      timezone: 'America/Jamaica',
      fiscalYearStartMonth: 4,
    }
    const fetch = response(preferences)
    expect(
      await integration(fetch).reportPreferences.retrieve('org_123')
    ).toEqual({ data: preferences, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/integrations/organizations/org_123/report-preferences`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('serves integration item sales summaries behind the organization path', async () => {
    const summary = {
      object: 'item-sales-summary' as const,
      timezone: 'America/Jamaica',
      from: 1_000,
      to: 2_000,
      itemId: 'item_1',
      rows: [],
      monthlyBuckets: [],
    }
    const fetch = response(summary)
    expect(
      await integration(fetch).items.salesSummary('org_123', 'item_1')
    ).toEqual({ data: summary, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/integrations/organizations/org_123/items/item_1/sales-summary`,
      expect.objectContaining({ method: 'GET' })
    )
  })
})
