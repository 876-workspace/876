import 'server-only'

import { cache } from 'react'
import * as Sentry from '@sentry/nextjs'

import { getPlatformClient } from '@/lib/services/platform'
import { CRM_APP_SLUG } from '@/lib/crm-app'
import type {
  CrmFeatureRequest,
  CrmFeatures,
  CrmUiFeatures,
} from '@/types/features'

const CRM_SEARCH_BAR_SLUG = 'crm-search-bar'
const CRM_THEME_SWITCHER_SLUG = 'crm-theme-switcher'
const CRM_GLOBAL_ADD_SLUG = 'crm-global-add'
const CRM_APP_SWITCHER_SLUG = 'crm-app-switcher'
const CRM_ORG_SWITCHER_SLUG = 'crm-org-switcher'

const LEGACY_FEATURE_SLUGS: Readonly<Record<string, readonly string[]>> = {
  [CRM_SEARCH_BAR_SLUG]: ['crm_search_bar'],
  [CRM_THEME_SWITCHER_SLUG]: ['crm_theme_switcher'],
  [CRM_GLOBAL_ADD_SLUG]: ['crm_global_add'],
  [CRM_APP_SWITCHER_SLUG]: ['crm_app_switcher'],
  [CRM_ORG_SWITCHER_SLUG]: ['crm_org_switcher'],
}

function hasFeature(enabledSlugs: ReadonlySet<string>, canonicalSlug: string) {
  return (
    enabledSlugs.has(canonicalSlug) ||
    (LEGACY_FEATURE_SLUGS[canonicalSlug] ?? []).some((legacySlug) =>
      enabledSlugs.has(legacySlug)
    )
  )
}

const DEFAULT_UI_FEATURES: CrmUiFeatures = {
  searchBar: false,
  themeSwitcher: false,
  globalAdd: false,
  appSwitcher: false,
  orgSwitcher: false,
}

export async function getFeatures({
  userId,
  organizationId,
}: CrmFeatureRequest): Promise<CrmFeatures> {
  return getCachedFeatures(userId, organizationId)
}

const getCachedFeatures = cache(async function getCachedFeatures(
  userId?: string,
  organizationId?: string
): Promise<CrmFeatures> {
  const platform = await getPlatformClient()
  const { data, error } = await platform.features.evaluate({
    appSlug: CRM_APP_SLUG,
    userId,
    organizationId,
  })
  if (error || !data) {
    Sentry.captureMessage('Feature flag outage: features.evaluate failed', {
      level: 'error',
      tags: { category: 'feature_flags' },
      extra: {
        call: 'features.evaluate',
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
        appSlug: CRM_APP_SLUG,
      },
    })
    return { uiFeatures: DEFAULT_UI_FEATURES }
  }

  const enabledSlugs = new Set(data.data.map((feature) => feature.slug))

  return {
    uiFeatures: {
      searchBar: hasFeature(enabledSlugs, CRM_SEARCH_BAR_SLUG),
      themeSwitcher: hasFeature(enabledSlugs, CRM_THEME_SWITCHER_SLUG),
      globalAdd: hasFeature(enabledSlugs, CRM_GLOBAL_ADD_SLUG),
      appSwitcher: hasFeature(enabledSlugs, CRM_APP_SWITCHER_SLUG),
      orgSwitcher: hasFeature(enabledSlugs, CRM_ORG_SWITCHER_SLUG),
    },
  }
})
