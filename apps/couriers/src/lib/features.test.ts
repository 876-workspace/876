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
vi.mock('@/lib/876/platform-client', () => ({
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
      'couriers_search_bar',
      {
        searchBar: true,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
      },
    ],
    [
      'theme switcher',
      'couriers_theme_switcher',
      {
        searchBar: false,
        themeSwitcher: true,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
      },
    ],
    [
      'global add',
      'couriers_global_add',
      {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: true,
        appSwitcher: false,
        orgSwitcher: false,
      },
    ],
    [
      'app switcher',
      'couriers_app_switcher',
      {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: true,
        orgSwitcher: false,
      },
    ],
    [
      'organization switcher',
      'couriers_org_switcher',
      {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: true,
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

  it('keeps the notepad widget enabled when every existing widget flag is present', async () => {
    const evaluation = createEvaluationResult([
      'platform_widgets',
      'platform_widgets_notepad',
      'couriers_widgets',
      'couriers_widgets_notepad',
    ])
    mocks.evaluate.mockResolvedValue(evaluation)

    const result = await getFeatures({
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })

    expect(result).toEqual({
      uiFeatures: {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
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
      'platform_widgets',
      'platform_widgets_notepad',
      'couriers_widgets',
    ])
    mocks.evaluate.mockResolvedValue(evaluation)

    const result = await getFeatures({
      userId: 'user_kingston_123',
      organizationId: 'organization_island_123',
    })

    expect(result).toEqual({
      uiFeatures: {
        searchBar: false,
        themeSwitcher: false,
        globalAdd: false,
        appSwitcher: false,
        orgSwitcher: false,
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
        uiFeatures: {
          searchBar: false,
          themeSwitcher: false,
          globalAdd: false,
          appSwitcher: false,
          orgSwitcher: false,
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
