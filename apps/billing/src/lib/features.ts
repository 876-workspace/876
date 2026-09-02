import 'server-only'

import { cache } from 'react'
import * as Sentry from '@sentry/nextjs'
import {
  chatWidgetMetadata,
  isWidgetEnabled,
  notepadWidgetMetadata,
} from '@876/widgets'

import { getPlatformClient } from '@/lib/services/platform'
import { BILLING_APP_SLUG } from '@/lib/billing-app'
import type {
  BillingFeatures,
  BillingProductFeatures,
  BillingUiFeatures,
} from '@/types/features'

const BILLING_SEARCH_BAR_SLUG = 'billing-search-bar'
const BILLING_THEME_SWITCHER_SLUG = 'billing-theme-switcher'
const BILLING_GLOBAL_ADD_SLUG = 'billing-global-add'
const BILLING_APP_SWITCHER_SLUG = 'billing-app-switcher'
const BILLING_ORG_SWITCHER_SLUG = 'billing-org-switcher'
const BILLING_SALES_SLUG = 'billing-sales'
const BILLING_SALES_QUOTES_SLUG = 'billing-sales-quotes'
const BILLING_SALES_ESTIMATES_SLUG = 'billing-sales-estimates'
const BILLING_SALES_INVOICES_SLUG = 'billing-sales-invoices'
const BILLING_SUBSCRIPTIONS_SLUG = 'billing-subscriptions'
const BILLING_PURCHASES_SLUG = 'billing-purchases'
const BILLING_PURCHASES_VENDORS_SLUG = 'billing-purchases-vendors'
const BILLING_PURCHASES_EXPENSES_SLUG = 'billing-purchases-expenses'
const BILLING_BANKING_SLUG = 'billing-banking'
const BILLING_DOCUMENTS_SLUG = 'billing-documents'
const BILLING_PAYROLL_SLUG = 'billing-payroll'

const BILLING_FEATURE_SLUGS = [
  BILLING_SEARCH_BAR_SLUG,
  BILLING_THEME_SWITCHER_SLUG,
  BILLING_GLOBAL_ADD_SLUG,
  BILLING_APP_SWITCHER_SLUG,
  BILLING_ORG_SWITCHER_SLUG,
  BILLING_SALES_SLUG,
  BILLING_SALES_QUOTES_SLUG,
  BILLING_SALES_ESTIMATES_SLUG,
  BILLING_SALES_INVOICES_SLUG,
  BILLING_SUBSCRIPTIONS_SLUG,
  BILLING_PURCHASES_SLUG,
  BILLING_PURCHASES_VENDORS_SLUG,
  BILLING_PURCHASES_EXPENSES_SLUG,
  BILLING_BANKING_SLUG,
  BILLING_DOCUMENTS_SLUG,
  BILLING_PAYROLL_SLUG,
] as const

const LEGACY_FEATURE_SLUGS: Readonly<Record<string, readonly string[]>> = {
  [BILLING_SEARCH_BAR_SLUG]: ['billing_search_bar'],
  [BILLING_THEME_SWITCHER_SLUG]: ['billing_theme_switcher'],
  [BILLING_GLOBAL_ADD_SLUG]: ['billing_global_add'],
  [BILLING_APP_SWITCHER_SLUG]: ['billing_app_switcher'],
  [BILLING_ORG_SWITCHER_SLUG]: ['billing_org_switcher'],
  [BILLING_SALES_SLUG]: ['billing_sales'],
  [BILLING_SALES_QUOTES_SLUG]: ['billing_sales_quotes'],
  [BILLING_SALES_ESTIMATES_SLUG]: ['billing_sales_estimates'],
  [BILLING_SALES_INVOICES_SLUG]: ['billing_sales_invoices'],
  [BILLING_SUBSCRIPTIONS_SLUG]: ['billing_subscriptions'],
  [BILLING_PURCHASES_SLUG]: ['billing_purchases'],
  [BILLING_PURCHASES_VENDORS_SLUG]: ['billing_purchases_vendors'],
  [BILLING_PURCHASES_EXPENSES_SLUG]: ['billing_purchases_expenses'],
  [BILLING_BANKING_SLUG]: ['billing_banking'],
  [BILLING_DOCUMENTS_SLUG]: ['billing_documents'],
  [BILLING_PAYROLL_SLUG]: ['billing_payroll'],
}

function hasFeature(enabledSlugs: ReadonlySet<string>, canonicalSlug: string) {
  return (
    enabledSlugs.has(canonicalSlug) ||
    (LEGACY_FEATURE_SLUGS[canonicalSlug] ?? []).some((legacySlug) =>
      enabledSlugs.has(legacySlug)
    )
  )
}

const DEFAULT_UI_FEATURES: BillingUiFeatures = {
  searchBar: false,
  themeSwitcher: false,
  globalAdd: false,
  appSwitcher: false,
  orgSwitcher: false,
  chat: false,
}

const DEFAULT_PRODUCT_FEATURES: BillingProductFeatures = {
  sales: false,
  quotes: false,
  estimates: false,
  invoices: false,
  subscriptions: false,
  purchases: false,
  vendors: false,
  expenses: false,
  banking: false,
  documents: false,
  payroll: false,
}

export async function getFeatures({
  userId,
  organizationId,
}: {
  userId?: string
  organizationId?: string
}) {
  return getCachedFeatures(userId, organizationId)
}

const getCachedFeatures = cache(async function getCachedFeatures(
  userId?: string,
  organizationId?: string
): Promise<BillingFeatures> {
  const platform = await getPlatformClient()

  const { data: evaluateResult, error: evaluateError } =
    await platform.features.evaluate({
      appSlug: BILLING_APP_SLUG,
      userId,
      organizationId,
    })
  if (evaluateError || !evaluateResult) {
    Sentry.captureMessage('Feature flag outage: features.evaluate failed', {
      level: 'error',
      tags: { category: 'feature-flags' },
      extra: {
        call: 'features.evaluate',
        errorCode: evaluateError?.code ?? null,
        errorMessage: evaluateError?.message ?? null,
        appSlug: BILLING_APP_SLUG,
      },
    })
    return {
      featureKeys: [],
      uiFeatures: DEFAULT_UI_FEATURES,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
      widgets: { notepad: false },
    }
  }

  const enabledSlugs = new Set(
    evaluateResult.data.map((feature) => feature.slug)
  )
  const sales = hasFeature(enabledSlugs, BILLING_SALES_SLUG)
  const purchases = hasFeature(enabledSlugs, BILLING_PURCHASES_SLUG)

  return {
    featureKeys: BILLING_FEATURE_SLUGS.filter((slug) =>
      hasFeature(enabledSlugs, slug)
    ),
    uiFeatures: {
      searchBar: hasFeature(enabledSlugs, BILLING_SEARCH_BAR_SLUG),
      themeSwitcher: hasFeature(enabledSlugs, BILLING_THEME_SWITCHER_SLUG),
      globalAdd: hasFeature(enabledSlugs, BILLING_GLOBAL_ADD_SLUG),
      appSwitcher: hasFeature(enabledSlugs, BILLING_APP_SWITCHER_SLUG),
      orgSwitcher: hasFeature(enabledSlugs, BILLING_ORG_SWITCHER_SLUG),
      chat: isWidgetEnabled(chatWidgetMetadata, 'billing', enabledSlugs),
    },
    productFeatures: {
      sales,
      quotes: sales && hasFeature(enabledSlugs, BILLING_SALES_QUOTES_SLUG),
      estimates:
        sales && hasFeature(enabledSlugs, BILLING_SALES_ESTIMATES_SLUG),
      invoices: sales && hasFeature(enabledSlugs, BILLING_SALES_INVOICES_SLUG),
      subscriptions: hasFeature(enabledSlugs, BILLING_SUBSCRIPTIONS_SLUG),
      purchases,
      vendors:
        purchases && hasFeature(enabledSlugs, BILLING_PURCHASES_VENDORS_SLUG),
      expenses:
        purchases && hasFeature(enabledSlugs, BILLING_PURCHASES_EXPENSES_SLUG),
      banking: hasFeature(enabledSlugs, BILLING_BANKING_SLUG),
      documents: hasFeature(enabledSlugs, BILLING_DOCUMENTS_SLUG),
      payroll: hasFeature(enabledSlugs, BILLING_PAYROLL_SLUG),
    },
    widgets: {
      notepad: isWidgetEnabled(notepadWidgetMetadata, 'billing', enabledSlugs),
    },
  }
})
