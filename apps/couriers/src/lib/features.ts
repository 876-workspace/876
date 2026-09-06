import 'server-only'

import { cache } from 'react'
import * as Sentry from '@sentry/nextjs'
import { resolveExperimentDecision } from '@876/core/platform'
import {
  chatWidgetMetadata,
  isWidgetEnabled,
  notepadWidgetMetadata,
} from '@876/widgets'

import { getPlatformClient } from '@/lib/services/platform'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import type { CouriersFeatureRequest, CouriersFeatures } from '@/types/features'

const COURIERS_SEARCH_BAR_SLUG = 'couriers-search-bar'
const COURIERS_THEME_SWITCHER_SLUG = 'couriers-theme-switcher'
const COURIERS_GLOBAL_ADD_SLUG = 'couriers-global-add'
const COURIERS_APP_SWITCHER_SLUG = 'couriers-app-switcher'
const COURIERS_ORG_SWITCHER_SLUG = 'couriers-org-switcher'
const COURIERS_STORAGE_ORG_LOGO_UPLOAD_SLUG = 'couriers-storage-org-logo-upload'

const LEGACY_FEATURE_SLUGS: Readonly<Record<string, readonly string[]>> = {
  [COURIERS_SEARCH_BAR_SLUG]: ['couriers_search_bar'],
  [COURIERS_THEME_SWITCHER_SLUG]: ['couriers_theme_switcher'],
  [COURIERS_GLOBAL_ADD_SLUG]: ['couriers_global_add'],
  [COURIERS_APP_SWITCHER_SLUG]: ['couriers_app_switcher'],
  [COURIERS_ORG_SWITCHER_SLUG]: ['couriers_org_switcher'],
  [COURIERS_STORAGE_ORG_LOGO_UPLOAD_SLUG]: ['couriers_storage_org_logo_upload'],
}

function hasFeature(enabledSlugs: ReadonlySet<string>, canonicalSlug: string) {
  return (
    enabledSlugs.has(canonicalSlug) ||
    (LEGACY_FEATURE_SLUGS[canonicalSlug] ?? []).some((legacySlug) =>
      enabledSlugs.has(legacySlug)
    )
  )
}

const DEFAULT_UI_FEATURES: CouriersFeatures['uiFeatures'] = {
  searchBar: false,
  themeSwitcher: false,
  globalAdd: false,
  appSwitcher: false,
  orgSwitcher: false,
  chat: false,
}
const DISABLED_FEATURES: CouriersFeatures = {
  storageOrgLogoUpload: false,
  uiFeatures: DEFAULT_UI_FEATURES,
  enabledWidgetIds: [],
}

export async function getFeatures({
  userId,
  organizationId,
}: CouriersFeatureRequest): Promise<CouriersFeatures> {
  return getCachedFeatures(userId, organizationId)
}

const getCachedFeatures = cache(async function getCachedFeatures(
  userId: string,
  organizationId: string
): Promise<CouriersFeatures> {
  const platform = await getPlatformClient()
  const { data, error } = await platform.features.evaluate({
    appSlug: COURIERS_APP_SLUG,
    userId,
    organizationId,
  })
  if (error || !data) {
    Sentry.captureMessage('Feature flag outage: features.evaluate failed', {
      level: 'error',
      tags: { category: 'feature-flags' },
      extra: {
        call: 'features.evaluate',
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
        appSlug: COURIERS_APP_SLUG,
      },
    })
    return DISABLED_FEATURES
  }

  const enabledSlugs = new Set(data.data.map((feature) => feature.slug))
  const enabledWidgetIds = isWidgetEnabled(
    notepadWidgetMetadata,
    'couriers',
    enabledSlugs
  )
    ? [notepadWidgetMetadata.id]
    : []

  return {
    storageOrgLogoUpload: hasFeature(
      enabledSlugs,
      COURIERS_STORAGE_ORG_LOGO_UPLOAD_SLUG
    ),
    uiFeatures: {
      searchBar: hasFeature(enabledSlugs, COURIERS_SEARCH_BAR_SLUG),
      themeSwitcher: hasFeature(enabledSlugs, COURIERS_THEME_SWITCHER_SLUG),
      globalAdd: hasFeature(enabledSlugs, COURIERS_GLOBAL_ADD_SLUG),
      appSwitcher: hasFeature(enabledSlugs, COURIERS_APP_SWITCHER_SLUG),
      orgSwitcher: hasFeature(enabledSlugs, COURIERS_ORG_SWITCHER_SLUG),
      chat: isWidgetEnabled(chatWidgetMetadata, 'couriers', enabledSlugs),
    },
    enabledWidgetIds,
  }
})

/**
 * Resolves a PostHog experiment for the Couriers app.
 */
export async function getCouriersExperiment<T = unknown>(
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
  const platform = await getPlatformClient()
  const { data, error } = await platform.features.evaluateDetails({
    appSlug: COURIERS_APP_SLUG,
    userId,
    organizationId,
    visitorId,
  })
  return error || !data ? null : data.data
})
