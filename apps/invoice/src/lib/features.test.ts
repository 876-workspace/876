import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getFeatures } from './features'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/lib/clients/platform', () => ({
  getPlatformClient: async () => ({
    features: { evaluate: mocks.evaluate },
  }),
}))

vi.mock('@sentry/nextjs', () => ({
  captureMessage: mocks.captureMessage,
}))

const ALL_DISABLED = {
  searchBar: false,
  themeSwitcher: false,
  globalAdd: false,
  appSwitcher: false,
  orgSwitcher: false,
}

describe('getFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps every server-evaluated Invoice key to its UI capability', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'invoice-search-bar' },
          { slug: 'invoice-theme-switcher' },
          { slug: 'invoice-global-add' },
          { slug: 'invoice-app-switcher' },
          { slug: 'invoice-org-switcher' },
          { slug: 'invoice-requests' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({
      userId: 'user_invoice_flags',
      organizationId: 'org_invoice_flags',
    })

    expect(result.featureKeys).toEqual([
      'invoice-search-bar',
      'invoice-theme-switcher',
      'invoice-global-add',
      'invoice-app-switcher',
      'invoice-org-switcher',
      'invoice-requests',
    ])
    expect(result.uiFeatures).toEqual({
      searchBar: true,
      themeSwitcher: true,
      globalAdd: true,
      appSwitcher: true,
      orgSwitcher: true,
    })
    expect(result.widgets).toEqual({ enabledWidgetIds: [] })
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-invoice',
      userId: 'user_invoice_flags',
      organizationId: 'org_invoice_flags',
    })
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it('enables Work only when all platform and Invoice widget gates are present', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'platform-widgets' },
          { slug: 'platform-widgets-work' },
          { slug: 'invoice-widgets' },
          { slug: 'invoice-widgets-work' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({
      userId: 'user_invoice_work',
      organizationId: 'org_invoice_work',
    })

    expect(result.featureKeys).toEqual([
      'invoice-widgets',
      'invoice-widgets-work',
    ])
    expect(result.widgets).toEqual({ enabledWidgetIds: ['work'] })
  })

  it('keeps Work disabled when any required gate is missing', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'platform-widgets' },
          { slug: 'platform-widgets-work' },
          { slug: 'invoice-widgets' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({ userId: 'user_invoice_widgets' })

    expect(result.featureKeys).toEqual(['invoice-widgets'])
    expect(result.widgets).toEqual({ enabledWidgetIds: [] })
  })

  it('keeps Requests independent when Work widget gates are absent', async () => {
    mocks.evaluate.mockResolvedValue({
      data: { data: [{ slug: 'invoice-requests' }] },
      error: null,
    })

    const result = await getFeatures({ userId: 'user_requests_only' })

    expect(result.featureKeys).toEqual(['invoice-requests'])
    expect(result.widgets).toEqual({ enabledWidgetIds: [] })
  })

  it('ignores flags belonging to another app', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'billing-search-bar' },
          { slug: 'crm-global-add' },
          { slug: 'invoice-org-switcher' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({ userId: 'user_other_flags' })

    expect(result.featureKeys).toEqual(['invoice-org-switcher'])
    expect(result.uiFeatures).toEqual({ ...ALL_DISABLED, orgSwitcher: true })
    expect(result.widgets).toEqual({ enabledWidgetIds: [] })
  })

  it('fails closed and reports when server evaluation errors', async () => {
    mocks.evaluate.mockResolvedValue({
      data: null,
      error: { code: 'features/unavailable', message: 'down' },
    })

    const result = await getFeatures({ userId: 'user_unavailable' })

    expect(result).toEqual({
      featureKeys: [],
      uiFeatures: ALL_DISABLED,
      widgets: { enabledWidgetIds: [] },
    })
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      'Feature flag outage: features.evaluate failed',
      {
        level: 'error',
        tags: { category: 'feature-flags' },
        extra: {
          call: 'features.evaluate',
          errorCode: 'features/unavailable',
          errorMessage: 'down',
          appSlug: '876-invoice',
        },
      }
    )
  })

  it('fails closed when evaluation resolves without data or error', async () => {
    mocks.evaluate.mockResolvedValue({ data: null, error: null })

    const result = await getFeatures({})

    expect(result).toEqual({
      featureKeys: [],
      uiFeatures: ALL_DISABLED,
      widgets: { enabledWidgetIds: [] },
    })
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
  })
})
