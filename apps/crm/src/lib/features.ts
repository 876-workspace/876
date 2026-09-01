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
      searchBar: enabledSlugs.has(CRM_SEARCH_BAR_SLUG),
      themeSwitcher: enabledSlugs.has(CRM_THEME_SWITCHER_SLUG),
      globalAdd: enabledSlugs.has(CRM_GLOBAL_ADD_SLUG),
      appSwitcher: enabledSlugs.has(CRM_APP_SWITCHER_SLUG),
      orgSwitcher: enabledSlugs.has(CRM_ORG_SWITCHER_SLUG),
    },
  }
})
