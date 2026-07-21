import 'server-only'

import { isWidgetEnabled } from '@876/widgets'

import { $876 } from '@/lib/876'
import { CONSOLE_APP_SLUG } from '@/lib/console-app'
import type { ConsoleFeatureRequest, ConsoleFeatures } from '@/types/features'

export const CHAT_FEATURE_SLUG = 'console_chat'

const DISABLED_FEATURES: ConsoleFeatures = {
  enabledWidgetIds: [],
  uiFeatures: {
    themeSwitcher: false,
    globalAdd: false,
    appSwitcher: false,
    searchBar: false,
    chat: false,
  },
}

export async function getConsoleFeatures({
  userId,
  widgets,
}: ConsoleFeatureRequest): Promise<ConsoleFeatures> {
  const { data: appList, error: appError } = await $876.apps.list({
    limit: 100,
    clientType: 'public',
  })
  if (appError || !appList) return DISABLED_FEATURES

  const consoleApp = appList.data.find((app) => app.slug === CONSOLE_APP_SLUG)
  if (!consoleApp) return DISABLED_FEATURES

  const enabledResult = await $876.features.evaluate({
    appId: consoleApp.id,
    userId,
  })
  if (enabledResult.error || !enabledResult.data) return DISABLED_FEATURES

  const enabledSlugs = new Set(
    enabledResult.data.data.map((feature) => feature.slug)
  )
  const uiFeatures = {
    themeSwitcher: enabledSlugs.has('console_theme_switcher'),
    globalAdd: enabledSlugs.has('console_global_add'),
    appSwitcher: enabledSlugs.has('console_app_switcher'),
    searchBar: enabledSlugs.has('console_search_bar'),
    chat: enabledSlugs.has(CHAT_FEATURE_SLUG),
  }

  const enabledWidgetIds = widgets
    .filter((widget) => isWidgetEnabled(widget, 'console', enabledSlugs))
    .map((widget) => widget.id)

  return { enabledWidgetIds, uiFeatures }
}
