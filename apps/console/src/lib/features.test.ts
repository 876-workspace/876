import { beforeEach, describe, expect, it, vi } from 'vitest'

import { widgetCatalog } from '@/features/widgets/widget-catalog'
import { notepadWidgetMetadata } from '@876/widgets'
import { getConsoleFeatures } from './features'

const mocks = vi.hoisted(() => ({
  appsList: vi.fn(),
  featuresEvaluate: vi.fn(),
}))

vi.mock('@/lib/console-app', () => ({ CONSOLE_APP_SLUG: 'console' }))
vi.mock('@/lib/services/platform', () => ({
  platform: {
    apps: { list: mocks.appsList },
  },
}))
vi.mock('@/lib/services/workspace', () => ({
  workspace: {
    features: { evaluate: mocks.featuresEvaluate },
  },
}))

const disabledResult = {
  enabledWidgetIds: [],
  uiFeatures: {
    themeSwitcher: false,
    globalAdd: false,
    appSwitcher: false,
    searchBar: false,
    chat: false,
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

  it('evaluates Console flags when its app is on a later catalog page', async () => {
    mocks.appsList
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'app_billing', slug: '876-billing' }],
          has_more: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'app_console', slug: 'console' }],
          has_more: false,
        },
        error: null,
      })
    const result = await getConsoleFeatures({ userId: 'user_123', widgets: [] })
    expect(result).toEqual(disabledResult)
    expect(mocks.appsList).toHaveBeenCalledTimes(2)
    expect(mocks.appsList).toHaveBeenLastCalledWith({
      limit: 100,
      clientType: 'public',
      startingAfter: 'app_billing',
    })
    expect(mocks.featuresEvaluate).toHaveBeenCalledWith({
      appId: 'app_console',
      userId: 'user_123',
    })
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
      startingAfter: undefined,
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
      listResult(['console-theme-switcher', 'console-search-bar'])
    )

    const result = await getConsoleFeatures({
      widgets: widgetCatalog,
    })

    expect(result).toEqual({
      enabledWidgetIds: [],
      uiFeatures: {
        themeSwitcher: true,
        globalAdd: false,
        appSwitcher: false,
        searchBar: true,
        chat: false,
      },
    })
  })

  it('treats Chat as a widget and excludes it from the panel widget list', async () => {
    mocks.featuresEvaluate.mockResolvedValue(
      listResult([
        'platform-widgets',
        'platform-widgets-chat',
        'console-widgets',
        'console-widgets-chat',
      ])
    )

    const result = await getConsoleFeatures({ widgets: widgetCatalog })

    expect(result.uiFeatures.chat).toBe(true)
    expect(result.enabledWidgetIds).not.toContain('chat')
  })

  it('requires both platform and app flags for shared widgets and keeps private widgets app-scoped', async () => {
    mocks.featuresEvaluate.mockResolvedValue(
      listResult([
        'console-widgets',
        'console-widgets-notepad',
        'console-widgets-live-logs',
        'platform-widgets',
        'platform-widgets-notepad',
        'console-global-add',
        'console-app-switcher',
      ])
    )
    const result = await getConsoleFeatures({
      userId: undefined,
      widgets: widgetCatalog,
    })

    expect(result).toEqual({
      enabledWidgetIds: ['notepad', 'live_logs'],
      uiFeatures: {
        themeSwitcher: false,
        globalAdd: true,
        appSwitcher: true,
        searchBar: false,
        chat: false,
      },
    })
    expect(mocks.featuresEvaluate).toHaveBeenCalledWith({
      appId: 'app_console',
      userId: undefined,
    })
  })
})
