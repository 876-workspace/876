import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getFeatures } from './features'

const mocks = vi.hoisted(() => ({ evaluate: vi.fn() }))

vi.mock('@/lib/services/platform', () => ({
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
          { slug: 'billing-search-bar' },
          { slug: 'billing-theme-switcher' },
          { slug: 'billing-org-switcher' },
          { slug: 'platform-widgets-chat' },
          { slug: 'billing-widgets-chat' },
          { slug: 'billing-sales' },
          { slug: 'billing-sales-quotes' },
          { slug: 'billing-sales-estimates' },
          { slug: 'billing-sales-invoices' },
          { slug: 'billing-subscriptions' },
          { slug: 'billing-purchases' },
          { slug: 'billing-purchases-vendors' },
          { slug: 'billing-banking' },
          { slug: 'billing-documents' },
          { slug: 'billing-payroll' },
          { slug: 'platform-widgets' },
          { slug: 'platform-widgets-notepad' },
          { slug: 'billing-widgets' },
          { slug: 'billing-widgets-notepad' },
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
      chat: true,
    })
    expect(result.productFeatures).toEqual({
      sales: true,
      quotes: true,
      estimates: true,
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
          { slug: 'billing-sales-quotes' },
          { slug: 'billing-sales-invoices' },
          { slug: 'billing-purchases-vendors' },
          { slug: 'billing-purchases-expenses' },
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
      chat: false,
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

  it('does not render Chat when either widget master is unavailable', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'platform-widgets-chat' },
          { slug: 'billing-widgets' },
          { slug: 'billing-widgets-chat' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({ userId: 'user_without_widget_master' })

    expect(result.uiFeatures.chat).toBe(false)
  })

  it('keeps the organization switcher disabled when its feature key is absent', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [{ slug: 'billing-search-bar' }],
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
      chat: false,
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
      chat: false,
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
