import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPlatformClient: vi.fn(),
  evaluate: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  }
})
vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/couriers-app', () => ({
  COURIERS_APP_SLUG: '876-couriers',
}))

import { getFeatures } from './features'

type EvaluationResult = {
  data: { data: Array<{ slug: string }> } | null
  error: { code: string; message: string } | null
}

function createEvaluationResult(
  slugs: string[],
  overrides: Partial<EvaluationResult> = {}
): EvaluationResult {
  return {
    data: { data: slugs.map((slug) => ({ slug })) },
    error: null,
    ...overrides,
  }
}

describe('getFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPlatformClient.mockResolvedValue({
      features: { evaluate: mocks.evaluate },
    })
    mocks.evaluate.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
  })

  it.each([
    [
      'search bar',
      'couriers-search-bar',
      {
        searchBar: true,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
        chat: false,
      },
    ],
    [
      'theme switcher',
      'couriers-theme-switcher',
      {
        searchBar: false,
        themeSwitcher: true,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
        chat: false,
      },
    ],
    [
      'global add',
      'couriers-global-add',
      {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: true,
        appSwitcher: false,
        orgSwitcher: false,
        chat: false,
      },
    ],
    [
      'app switcher',
      'couriers-app-switcher',
      {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: true,
        orgSwitcher: false,
        chat: false,
      },
    ],
    [
      'organization switcher',
      'couriers-org-switcher',
      {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: true,
        chat: false,
      },
    ],
  ] as const)(
    'enables only the %s UI capability when its flag is present',
    async (_name, slug, expectedUiFeatures) => {
      const evaluation = createEvaluationResult([slug])
      mocks.evaluate.mockResolvedValue(evaluation)

      const result = await getFeatures({
        userId: 'user_kingston_123',
        organizationId: 'organization_island_123',
      })

      expect(result).toEqual({
        storageOrgLogoUpload: false,
        uiFeatures: expectedUiFeatures,
        enabledWidgetIds: [],
      })
      expect(mocks.getPlatformClient).toHaveBeenCalledTimes(1)
      expect(mocks.evaluate).toHaveBeenCalledTimes(1)
      expect(mocks.evaluate).toHaveBeenCalledWith({
        appSlug: '876-couriers',
        userId: 'user_kingston_123',
        organizationId: 'organization_island_123',
      })
    }
  )

  it('enables organization logo uploads only when its flag is present', async () => {
    mocks.evaluate.mockResolvedValue(
      createEvaluationResult(['couriers-storage-org-logo-upload'])
    )

    const result = await getFeatures({
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })

    expect(result).toEqual({
      storageOrgLogoUpload: true,
      uiFeatures: {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
        chat: false,
      },
      enabledWidgetIds: [],
    })
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-couriers',
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })
  })

  it('does not enable logo uploads for similarly named unrelated flags', async () => {
    mocks.evaluate.mockResolvedValue(
      createEvaluationResult([
        'couriers-storage',
        'couriers-storage-org-logo',
        'storage-org-logo-upload',
        'platform-storage-org-logo-upload',
      ])
    )

    const result = await getFeatures({
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })

    expect(result.storageOrgLogoUpload).toBe(false)
  })

  it('keeps the notepad widget enabled when every widget flag is present', async () => {
    const evaluation = createEvaluationResult([
      'platform-widgets',
      'platform-widgets-notepad',
      'couriers-widgets',
      'couriers-widgets-notepad',
    ])
    mocks.evaluate.mockResolvedValue(evaluation)

    const result = await getFeatures({
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })

    expect(result).toEqual({
      storageOrgLogoUpload: false,
      uiFeatures: {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
        chat: false,
      },
      enabledWidgetIds: ['notepad'],
    })
    expect(mocks.evaluate).toHaveBeenCalledTimes(1)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-couriers',
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })
  })

  it('keeps the notepad widget disabled when one required widget flag is absent', async () => {
    const evaluation = createEvaluationResult([
      'platform-widgets',
      'platform-widgets-notepad',
      'couriers-widgets',
    ])
    mocks.evaluate.mockResolvedValue(evaluation)

    const result = await getFeatures({
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })

    expect(result).toEqual({
      storageOrgLogoUpload: false,
      uiFeatures: {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
        chat: false,
      },
      enabledWidgetIds: [],
    })
    expect(mocks.evaluate).toHaveBeenCalledTimes(1)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-couriers',
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })
  })

  it('requires the shared and Couriers widget hierarchy for Chat', async () => {
    mocks.evaluate.mockResolvedValue(
      createEvaluationResult([
        'platform-widgets',
        'platform-widgets-chat',
        'couriers-widgets',
        'couriers-widgets-chat',
      ])
    )

    const enabled = await getFeatures({
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })
    expect(enabled.uiFeatures.chat).toBe(true)

    mocks.evaluate.mockResolvedValue(
      createEvaluationResult([
        'platform-widgets-chat',
        'couriers-widgets',
        'couriers-widgets-chat',
      ])
    )
    const missingPlatformMaster = await getFeatures({
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })
    expect(missingPlatformMaster.uiFeatures.chat).toBe(false)
  })

  it.each([
    [
      'evaluation error',
      {
        data: null,
        error: {
          code: 'provider/unavailable',
          message: 'Feature evaluation is temporarily unavailable.',
        },
      },
    ],
    ['missing evaluation data', { data: null, error: null }],
    ['empty evaluation', { data: { data: [] }, error: null }],
  ] as const)(
    'returns the complete disabled defaults for an %s',
    async (_case, evaluation) => {
      mocks.evaluate.mockResolvedValue(evaluation)

      const result = await getFeatures({
        userId: 'user_kingston_123',
        organizationId: 'organization_island_123',
      })

      expect(result).toEqual({
        storageOrgLogoUpload: false,
        uiFeatures: {
          searchBar: false,
          themeSwitcher: false,
          globalAdd: false,
          appSwitcher: false,
          orgSwitcher: false,
          chat: false,
        },
        enabledWidgetIds: [],
      })
      expect(mocks.getPlatformClient).toHaveBeenCalledTimes(1)
      expect(mocks.evaluate).toHaveBeenCalledTimes(1)
      expect(mocks.evaluate).toHaveBeenCalledWith({
        appSlug: '876-couriers',
        userId: 'user_kingston_123',
        organizationId: 'organization_island_123',
      })
    }
  )
})
