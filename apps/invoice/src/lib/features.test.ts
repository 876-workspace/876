import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getFeatures } from './features'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/lib/services/platform', () => ({
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
    ])
    expect(result.uiFeatures).toEqual({
      searchBar: true,
      themeSwitcher: true,
      globalAdd: true,
      appSwitcher: true,
      orgSwitcher: true,
    })
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-invoice',
      userId: 'user_invoice_flags',
      organizationId: 'org_invoice_flags',
    })
    expect(mocks.captureMessage).not.toHaveBeenCalled()
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
  })

  it('fails closed and reports when server evaluation errors', async () => {
    mocks.evaluate.mockResolvedValue({
      data: null,
      error: { code: 'features/unavailable', message: 'down' },
    })

    const result = await getFeatures({ userId: 'user_unavailable' })

    expect(result).toEqual({ featureKeys: [], uiFeatures: ALL_DISABLED })
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

    expect(result).toEqual({ featureKeys: [], uiFeatures: ALL_DISABLED })
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
  })
})
