import 'server-only'

import * as Sentry from '@sentry/nextjs'
import { isWidgetEnabled } from '@876/widgets'

import { $876 } from '@/lib/876'
import { listConsoleApps } from '@/lib/apps-catalog'
import { CONSOLE_APP_SLUG } from '@/lib/console-app'
import { logger } from '@/lib/logger'
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
  // Through the shared per-request catalog: the app detail routes resolve their
  // slug from the identical list, and this used to be a second round trip for
  // the same answer on every app page.
  const apps = await listConsoleApps()
  if (!apps) {
    const message = 'Feature flag outage: apps.list failed'
    const context = {
      call: 'apps.list',
      errorCode: null,
      errorMessage: null,
      appSlug: CONSOLE_APP_SLUG,
    }
    Sentry.captureMessage(message, {
      level: 'error',
      tags: { category: 'feature_flags' },
      extra: context,
    })
    logger.error(context, message)
    return DISABLED_FEATURES
  }

  const consoleApp = apps.find((app) => app.slug === CONSOLE_APP_SLUG)
  if (!consoleApp) {
    const message =
      'Feature flag configuration drift: Console app missing from apps.list'
    const context = {
      call: 'apps.list',
      errorCode: null,
      errorMessage: null,
      appSlug: CONSOLE_APP_SLUG,
    }
    Sentry.captureMessage(message, {
      level: 'error',
      tags: { category: 'feature_flags' },
      extra: context,
    })
    logger.error(context, message)
    return DISABLED_FEATURES
  }

  const enabledResult = await $876.features.evaluate({
    appId: consoleApp.id,
    userId,
  })
  if (enabledResult.error || !enabledResult.data) {
    const message = 'Feature flag outage: features.evaluate failed'
    const context = {
      call: 'features.evaluate',
      errorCode: enabledResult.error?.code ?? null,
      errorMessage: enabledResult.error?.message ?? null,
      appSlug: CONSOLE_APP_SLUG,
      appId: consoleApp.id,
    }
    Sentry.captureMessage(message, {
      level: 'error',
      tags: { category: 'feature_flags' },
      extra: context,
    })
    logger.error(context, message)
    return DISABLED_FEATURES
  }

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
