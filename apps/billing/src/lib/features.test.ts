import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getFeatures } from './features'

const mocks = vi.hoisted(() => ({ evaluate: vi.fn() }))

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: async () => ({
    features: { evaluate: mocks.evaluate },
  }),
}))

describe('getFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps server-evaluated keys to UI capabilities', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'billing_search_bar' },
          { slug: 'billing_theme_switcher' },
          { slug: 'billing_org_switcher' },
          { slug: 'billing_sales' },
          { slug: 'billing_sales_quotes' },
          { slug: 'billing_sales_invoices' },
          { slug: 'billing_subscriptions' },
          { slug: 'billing_purchases' },
          { slug: 'billing_purchases_vendors' },
          { slug: 'billing_banking' },
          { slug: 'billing_documents' },
          { slug: 'billing_payroll' },
          { slug: 'platform_widgets' },
          { slug: 'platform_widgets_notepad' },
          { slug: 'billing_widgets' },
          { slug: 'billing_widgets_notepad' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({ userId: 'user_enabled' })

    expect(mocks.evaluate).toHaveBeenCalledTimes(1)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-billing',
      userId: 'user_enabled',
      organizationId: undefined,
    })
    expect(result.uiFeatures).toEqual({
      searchBar: true,
      themeSwitcher: true,
      globalAdd: false,
      appSwitcher: false,
      orgSwitcher: true,
    })
    expect(result.productFeatures).toEqual({
      sales: true,
      quotes: true,
      estimates: false,
      invoices: true,
      subscriptions: true,
      purchases: true,
      vendors: true,
      expenses: false,
      banking: true,
      documents: true,
      payroll: true,
    })
    expect(result.widgets).toEqual({ notepad: true })
  })

  it('requires group masters before enabling child features', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'billing_sales_quotes' },
          { slug: 'billing_sales_invoices' },
          { slug: 'billing_purchases_vendors' },
          { slug: 'billing_purchases_expenses' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({ userId: 'user_children_only' })

    expect(mocks.evaluate).toHaveBeenCalledTimes(1)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-billing',
      userId: 'user_children_only',
      organizationId: undefined,
    })
    expect(result.uiFeatures).toEqual({
      searchBar: false,
      themeSwitcher: false,
      globalAdd: false,
      appSwitcher: false,
      orgSwitcher: false,
    })
    expect(result.productFeatures).toEqual({
      sales: false,
      quotes: false,
      estimates: false,
      invoices: false,
      subscriptions: false,
      purchases: false,
      vendors: false,
      expenses: false,
      banking: false,
      documents: false,
      payroll: false,
    })
    expect(result.widgets).toEqual({ notepad: false })
  })

  it('keeps the organization switcher disabled when its feature key is absent', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [{ slug: 'billing_search_bar' }],
      },
      error: null,
    })

    const result = await getFeatures({
      userId: 'user_without_org_switcher',
      organizationId: 'org_island_123',
    })

    expect(mocks.evaluate).toHaveBeenCalledTimes(1)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-billing',
      userId: 'user_without_org_switcher',
      organizationId: 'org_island_123',
    })
    expect(result.uiFeatures).toEqual({
      searchBar: true,
      themeSwitcher: false,
      globalAdd: false,
      appSwitcher: false,
      orgSwitcher: false,
    })
    expect(result.productFeatures).toEqual({
      sales: false,
      quotes: false,
      estimates: false,
      invoices: false,
      subscriptions: false,
      purchases: false,
      vendors: false,
      expenses: false,
      banking: false,
      documents: false,
      payroll: false,
    })
    expect(result.widgets).toEqual({ notepad: false })
  })

  it('fails closed when server evaluation is unavailable', async () => {
    mocks.evaluate.mockResolvedValue({ data: null, error: { message: 'down' } })

    const result = await getFeatures({ userId: 'user_unavailable' })

    expect(mocks.evaluate).toHaveBeenCalledTimes(1)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-billing',
      userId: 'user_unavailable',
      organizationId: undefined,
    })
    expect(result.uiFeatures).toEqual({
      searchBar: false,
      themeSwitcher: false,
      globalAdd: false,
      appSwitcher: false,
      orgSwitcher: false,
    })
    expect(result.productFeatures).toEqual({
      sales: false,
      quotes: false,
      estimates: false,
      invoices: false,
      subscriptions: false,
      purchases: false,
      vendors: false,
      expenses: false,
      banking: false,
      documents: false,
      payroll: false,
    })
    expect(result.widgets).toEqual({ notepad: false })
  })
})
