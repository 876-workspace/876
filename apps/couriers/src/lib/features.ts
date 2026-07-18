import 'server-only'

import { cache } from 'react'
import { isWidgetEnabled, notepadWidgetMetadata } from '@876/widgets'

import { getPlatformClient } from '@/lib/876/platform-client'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import type { CouriersFeatureRequest, CouriersFeatures } from '@/types/features'

const COURIERS_SEARCH_BAR_SLUG = 'couriers_search_bar'
const COURIERS_THEME_SWITCHER_SLUG = 'couriers_theme_switcher'
const COURIERS_GLOBAL_ADD_SLUG = 'couriers_global_add'
const COURIERS_APP_SWITCHER_SLUG = 'couriers_app_switcher'
const COURIERS_ORG_SWITCHER_SLUG = 'couriers_org_switcher'
const DEFAULT_UI_FEATURES: CouriersFeatures['uiFeatures'] = {
  searchBar: false,
  themeSwitcher: false,
  globalAdd: false,
  appSwitcher: false,
  orgSwitcher: false,
}
const DISABLED_FEATURES: CouriersFeatures = {
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
  if (error || !data) return DISABLED_FEATURES

  const enabledSlugs = new Set(data.data.map((feature) => feature.slug))
  const enabledWidgetIds = isWidgetEnabled(
    notepadWidgetMetadata,
    'couriers',
    enabledSlugs
  )
    ? [notepadWidgetMetadata.id]
    : []

  return {
    uiFeatures: {
      searchBar: enabledSlugs.has(COURIERS_SEARCH_BAR_SLUG),
      themeSwitcher: enabledSlugs.has(COURIERS_THEME_SWITCHER_SLUG),
      globalAdd: enabledSlugs.has(COURIERS_GLOBAL_ADD_SLUG),
      appSwitcher: enabledSlugs.has(COURIERS_APP_SWITCHER_SLUG),
      orgSwitcher: enabledSlugs.has(COURIERS_ORG_SWITCHER_SLUG),
    },
    enabledWidgetIds,
  }
})
