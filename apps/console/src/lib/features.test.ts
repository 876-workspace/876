import { beforeEach, describe, expect, it, vi } from 'vitest'

import { consoleWidgetCatalog } from '@/components/widgets/widget-catalog'
import { notepadWidgetMetadata } from '@876/widgets'
import { getConsoleFeatures } from './features'

const mocks = vi.hoisted(() => ({
  appsList: vi.fn(),
  featuresEvaluate: vi.fn(),
}))

vi.mock('@/lib/console-app', () => ({ CONSOLE_APP_SLUG: 'console' }))
vi.mock('@/lib/876', () => ({
  $876: {
    apps: { list: mocks.appsList },
    features: {
      evaluate: mocks.featuresEvaluate,
    },
  },
}))

const disabledResult = {
  enabledWidgetIds: [],
  uiFeatures: {
    themeSwitcher: false,
    globalAdd: false,
    appSwitcher: false,
    searchBar: false,
  },
}

function listResult(slugs: string[]) {
  return {
    data: { data: slugs.map((slug) => ({ slug })) },
    error: null,
  }
}

describe('getConsoleFeatures', () => {
  beforeEach(() => {
    mocks.appsList.mockResolvedValue({
      data: { data: [{ id: 'app_console', slug: 'console' }] },
      error: null,
    })
    mocks.featuresEvaluate.mockResolvedValue(listResult([]))
    vi.clearAllMocks()
  })

  it('still evaluates UI flags when no widgets are registered', async () => {
    const result = await getConsoleFeatures({
      userId: 'user_123',
      widgets: [],
    })

    expect(result).toEqual(disabledResult)
    expect(mocks.appsList).toHaveBeenCalledTimes(1)
    expect(mocks.featuresEvaluate).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['an app-list error', { data: null, error: { message: 'Unavailable.' } }],
    ['missing app-list data', { data: null, error: null }],
  ])('returns disabled defaults for %s', async (_name, appResult) => {
    mocks.appsList.mockResolvedValue(appResult)

    const result = await getConsoleFeatures({
      widgets: [notepadWidgetMetadata],
    })

    expect(result).toEqual(disabledResult)
    expect(mocks.appsList).toHaveBeenCalledTimes(1)
    expect(mocks.appsList).toHaveBeenCalledWith({
      limit: 100,
      clientType: 'public',
    })
    expect(mocks.featuresEvaluate).not.toHaveBeenCalled()
  })

  it('returns disabled defaults when the Console app is not configured', async () => {
    mocks.appsList.mockResolvedValue({
      data: { data: [{ id: 'app_other', slug: 'other-app' }] },
      error: null,
    })

    const result = await getConsoleFeatures({
      widgets: [notepadWidgetMetadata],
    })

    expect(result).toEqual(disabledResult)
    expect(mocks.featuresEvaluate).not.toHaveBeenCalled()
  })

  it.each([
    ['an evaluation error', { data: null, error: { message: 'Unavailable.' } }],
    ['missing evaluation data', { data: null, error: null }],
  ])('returns disabled defaults for %s', async (_name, evaluatedResult) => {
    mocks.featuresEvaluate.mockResolvedValue(evaluatedResult)

    const result = await getConsoleFeatures({
      userId: 'user_123',
      widgets: [notepadWidgetMetadata],
    })

    expect(result).toEqual(disabledResult)
    expect(mocks.featuresEvaluate).toHaveBeenCalledTimes(1)
    expect(mocks.featuresEvaluate).toHaveBeenCalledWith({
      appId: 'app_console',
      userId: 'user_123',
    })
  })

  it('returns UI flags while withholding widgets when the master is disabled', async () => {
    mocks.featuresEvaluate.mockResolvedValue(
      listResult(['console_theme_switcher', 'console_search_bar'])
    )

    const result = await getConsoleFeatures({
      widgets: consoleWidgetCatalog,
    })

    expect(result).toEqual({
      enabledWidgetIds: [],
      uiFeatures: {
        themeSwitcher: true,
        globalAdd: false,
        appSwitcher: false,
        searchBar: true,
      },
    })
  })

  it('requires both platform and app flags for shared widgets and keeps private widgets app-scoped', async () => {
    mocks.featuresEvaluate.mockResolvedValue(
      listResult([
        'console_widgets',
        'console_widgets_notepad',
        'console_widgets_live_logs',
        'platform_widgets',
        'platform_widgets_notepad',
        'console_global_add',
        'console_app_switcher',
      ])
    )
    const result = await getConsoleFeatures({
      userId: undefined,
      widgets: consoleWidgetCatalog,
    })

    expect(result).toEqual({
      enabledWidgetIds: ['notepad', 'live_logs'],
      uiFeatures: {
        themeSwitcher: false,
        globalAdd: true,
        appSwitcher: true,
        searchBar: false,
      },
    })
    expect(mocks.featuresEvaluate).toHaveBeenCalledWith({
      appId: 'app_console',
      userId: undefined,
    })
  })
})
