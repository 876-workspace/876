import 'server-only'

import { cache } from 'react'
import * as Sentry from '@sentry/nextjs'
import { resolveExperimentDecision } from '@876/core/platform'
import { resolveEnabledWidgetIds } from '@876/widgets'

import { getPlatformClient } from '@/lib/services/platform'
import { INVOICE_APP_SLUG } from '@/lib/invoice-app'
import type {
  InvoiceFeatureRequest,
  InvoiceFeatures,
  InvoiceUiFeatures,
} from '@/types/features'

const INVOICE_SEARCH_BAR_SLUG = 'invoice-search-bar'
const INVOICE_THEME_SWITCHER_SLUG = 'invoice-theme-switcher'
const INVOICE_GLOBAL_ADD_SLUG = 'invoice-global-add'
const INVOICE_APP_SWITCHER_SLUG = 'invoice-app-switcher'
const INVOICE_ORG_SWITCHER_SLUG = 'invoice-org-switcher'
const INVOICE_WIDGETS_SLUG = 'invoice-widgets'
const INVOICE_WIDGETS_WORK_SLUG = 'invoice-widgets-work'

const INVOICE_FEATURE_SLUGS = [
  INVOICE_SEARCH_BAR_SLUG,
  INVOICE_THEME_SWITCHER_SLUG,
  INVOICE_GLOBAL_ADD_SLUG,
  INVOICE_APP_SWITCHER_SLUG,
  INVOICE_ORG_SWITCHER_SLUG,
  INVOICE_WIDGETS_SLUG,
  INVOICE_WIDGETS_WORK_SLUG,
] as const

const DEFAULT_UI_FEATURES: InvoiceUiFeatures = {
  searchBar: false,
  themeSwitcher: false,
  globalAdd: false,
  appSwitcher: false,
  orgSwitcher: false,
}

export async function getFeatures({
  userId,
  organizationId,
}: InvoiceFeatureRequest): Promise<InvoiceFeatures> {
  return getCachedFeatures(userId, organizationId)
}

const getCachedFeatures = cache(async function getCachedFeatures(
  userId?: string,
  organizationId?: string
): Promise<InvoiceFeatures> {
  const platform = await getPlatformClient()
  const { data, error } = await platform.features.evaluate({
    appSlug: INVOICE_APP_SLUG,
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
        appSlug: INVOICE_APP_SLUG,
      },
    })
    return {
      featureKeys: [],
      uiFeatures: DEFAULT_UI_FEATURES,
      widgets: { enabledWidgetIds: [] },
    }
  }

  const enabledSlugs = new Set(data.data.map((feature) => feature.slug))
  const enabledWidgetIds = resolveEnabledWidgetIds('invoice', enabledSlugs)

  return {
    featureKeys: INVOICE_FEATURE_SLUGS.filter((slug) => enabledSlugs.has(slug)),
    uiFeatures: {
      searchBar: enabledSlugs.has(INVOICE_SEARCH_BAR_SLUG),
      themeSwitcher: enabledSlugs.has(INVOICE_THEME_SWITCHER_SLUG),
      globalAdd: enabledSlugs.has(INVOICE_GLOBAL_ADD_SLUG),
      appSwitcher: enabledSlugs.has(INVOICE_APP_SWITCHER_SLUG),
      orgSwitcher: enabledSlugs.has(INVOICE_ORG_SWITCHER_SLUG),
    },
    widgets: {
      enabledWidgetIds,
    },
  }
})

/** Resolves a PostHog experiment for the Invoice app. */
export async function getInvoiceExperiment<T = unknown>(
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
    appSlug: INVOICE_APP_SLUG,
    userId,
    organizationId,
    visitorId,
  })
  return error || !data ? null : data.data
})
