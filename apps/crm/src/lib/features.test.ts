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

  it('maps every server-evaluated CRM key to its UI capability', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'crm-search-bar' },
          { slug: 'crm-theme-switcher' },
          { slug: 'crm-global-add' },
          { slug: 'crm-app-switcher' },
          { slug: 'crm-org-switcher' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({
      userId: 'user_2kL9mN4q',
      organizationId: 'org_7xQp2',
    })

    expect(result.uiFeatures).toEqual({
      searchBar: true,
      themeSwitcher: true,
      globalAdd: true,
      appSwitcher: true,
      orgSwitcher: true,
    })
    expect(mocks.evaluate).toHaveBeenCalledTimes(1)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-crm',
      userId: 'user_2kL9mN4q',
      organizationId: 'org_7xQp2',
    })
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it('leaves every capability disabled when no key is returned', async () => {
    mocks.evaluate.mockResolvedValue({ data: { data: [] }, error: null })

    const result = await getFeatures({ userId: 'user_no_flags' })

    expect(result.uiFeatures).toEqual(ALL_DISABLED)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-crm',
      userId: 'user_no_flags',
      organizationId: undefined,
    })
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it('ignores keys belonging to another app', async () => {
    mocks.evaluate.mockResolvedValue({
      data: {
        data: [
          { slug: 'billing-search-bar' },
          { slug: 'couriers-global-add' },
          { slug: 'crm-org-switcher' },
        ],
      },
      error: null,
    })

    const result = await getFeatures({ userId: 'user_other_app_flags' })

    expect(result.uiFeatures).toEqual({ ...ALL_DISABLED, orgSwitcher: true })
  })

  it('fails closed and reports when server evaluation errors', async () => {
    mocks.evaluate.mockResolvedValue({
      data: null,
      error: { code: 'features/unavailable', message: 'down' },
    })

    const result = await getFeatures({ userId: 'user_unavailable' })

    expect(result.uiFeatures).toEqual(ALL_DISABLED)
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      'Feature flag outage: features.evaluate failed',
      {
        level: 'error',
        tags: { category: 'feature_flags' },
        extra: {
          call: 'features.evaluate',
          errorCode: 'features/unavailable',
          errorMessage: 'down',
          appSlug: '876-crm',
        },
      }
    )
  })

  it('fails closed when evaluation resolves without data or error', async () => {
    mocks.evaluate.mockResolvedValue({ data: null, error: null })

    const result = await getFeatures({})

    expect(result.uiFeatures).toEqual(ALL_DISABLED)
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      'Feature flag outage: features.evaluate failed',
      {
        level: 'error',
        tags: { category: 'feature_flags' },
        extra: {
          call: 'features.evaluate',
          errorCode: null,
          errorMessage: null,
          appSlug: '876-crm',
        },
      }
    )
  })
})
