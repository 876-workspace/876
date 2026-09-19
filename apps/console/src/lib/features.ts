import 'server-only'
import { workspace } from '@/lib/clients/workspace'

import * as Sentry from '@sentry/nextjs'
import { chatWidgetMetadata, isWidgetEnabled } from '@876/widgets'
import { resolveExperimentDecision } from '@876/core/platform'
import { cache } from 'react'

import { listConsoleApps } from '@/lib/apps-catalog'
import { CONSOLE_APP_SLUG } from '@/lib/console-app'
import { logger } from '@/lib/logger'
import type { ConsoleFeatureRequest, ConsoleFeatures } from '@/types/features'

const LEGACY_FEATURE_SLUGS: Readonly<Record<string, readonly string[]>> = {
  'console-theme-switcher': ['console_theme_switcher'],
  'console-global-add': ['console_global_add'],
  'console-app-switcher': ['console_app_switcher'],
  'console-search-bar': ['console_search_bar'],
}

function hasFeature(enabledSlugs: ReadonlySet<string>, canonicalSlug: string) {
  return (
    enabledSlugs.has(canonicalSlug) ||
    (LEGACY_FEATURE_SLUGS[canonicalSlug] ?? []).some((legacySlug) =>
      enabledSlugs.has(legacySlug)
    )
  )
}

/**
 * One provider/local-governance feature evaluation per user per request.
 * React.cache compares arguments with Object.is, so this resolver deliberately
 * takes only the primitive user id rather than ConsoleFeatureRequest.
 */
const resolveConsoleFeatureKeys = cache(
  async function resolveConsoleFeatureKeys(
    userId: string | undefined
  ): Promise<string[]> {
    const { apps, error: appsError } = await listConsoleApps()
    if (!apps) {
      const message = 'Feature flag outage: apps.list failed'
      const context = {
        call: 'apps.list',
        errorCode: appsError?.code ?? null,
        errorMessage: appsError?.message ?? null,
        appSlug: CONSOLE_APP_SLUG,
      }
      Sentry.captureMessage(message, {
        level: 'error',
        tags: { category: 'feature-flags' },
        extra: context,
      })
      logger.error(context, message)
      return []
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
        tags: { category: 'feature-flags' },
        extra: context,
      })
      logger.error(context, message)
      return []
    }

    const enabledResult = await workspace.features.evaluate({
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
        tags: { category: 'feature-flags' },
        extra: context,
      })
      logger.error(context, message)
      return []
    }

    return enabledResult.data.data
      .map((feature) => feature.slug)
      .filter((slug): slug is string => typeof slug === 'string')
      .sort()
  }
)

/** Enabled raw feature keys for access-context and navigation resolution. */
export async function getConsoleFeatureKeys(
  userId?: string
): Promise<string[]> {
  return [...(await resolveConsoleFeatureKeys(userId))]
}

export async function getConsoleFeatures({
  userId,
  widgets,
}: ConsoleFeatureRequest): Promise<ConsoleFeatures> {
  const enabledSlugs = new Set(await getConsoleFeatureKeys(userId))
  const uiFeatures = {
    themeSwitcher: hasFeature(enabledSlugs, 'console-theme-switcher'),
    globalAdd: hasFeature(enabledSlugs, 'console-global-add'),
    appSwitcher: hasFeature(enabledSlugs, 'console-app-switcher'),
    searchBar: hasFeature(enabledSlugs, 'console-search-bar'),
    chat: isWidgetEnabled(chatWidgetMetadata, 'console', enabledSlugs),
  }

  const enabledWidgetIds = widgets
    .filter((widget) => widget.id !== chatWidgetMetadata.id)
    .filter((widget) => isWidgetEnabled(widget, 'console', enabledSlugs))
    .map((widget) => widget.id)

  return { enabledWidgetIds, uiFeatures }
}

/**
 * Resolves a PostHog experiment for the Console app.
 */
export async function getConsoleExperiment<T = unknown>(
  featureSlug: string,
  context?: {
    userId?: string
    organizationId?: string
    visitorId?: string
  }
) {
  return resolveExperimentDecision<T>(
    featureSlug,
    await getExperimentDecisions(
      context?.userId,
      context?.organizationId,
      context?.visitorId
    )
  )
}

const getExperimentDecisions = cache(async function getExperimentDecisions(
  userId: string | undefined,
  organizationId: string | undefined,
  visitorId: string | undefined
) {
  const { data, error } = await workspace.features.evaluateDetails({
    appSlug: CONSOLE_APP_SLUG,
    userId,
    organizationId,
    visitorId,
  })
  return error || !data ? null : data.data
})
