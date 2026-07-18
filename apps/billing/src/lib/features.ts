import 'server-only'

import { cache } from 'react'
import { isWidgetEnabled, notepadWidgetMetadata } from '@876/widgets'

import { getPlatformClient } from '@/lib/876/platform-client'
import { BILLING_APP_SLUG } from '@/lib/billing-app'
import type {
  BillingFeatures,
  BillingProductFeatures,
  BillingUiFeatures,
} from '@/types/features'

const BILLING_SEARCH_BAR_SLUG = 'billing_search_bar'
const BILLING_THEME_SWITCHER_SLUG = 'billing_theme_switcher'
const BILLING_GLOBAL_ADD_SLUG = 'billing_global_add'
const BILLING_APP_SWITCHER_SLUG = 'billing_app_switcher'
const BILLING_ORG_SWITCHER_SLUG = 'billing_org_switcher'
const BILLING_SALES_SLUG = 'billing_sales'
const BILLING_SALES_QUOTES_SLUG = 'billing_sales_quotes'
const BILLING_SALES_ESTIMATES_SLUG = 'billing_sales_estimates'
const BILLING_SALES_INVOICES_SLUG = 'billing_sales_invoices'
const BILLING_SUBSCRIPTIONS_SLUG = 'billing_subscriptions'
const BILLING_PURCHASES_SLUG = 'billing_purchases'
const BILLING_PURCHASES_VENDORS_SLUG = 'billing_purchases_vendors'
const BILLING_PURCHASES_EXPENSES_SLUG = 'billing_purchases_expenses'
const BILLING_BANKING_SLUG = 'billing_banking'
const BILLING_DOCUMENTS_SLUG = 'billing_documents'
const BILLING_PAYROLL_SLUG = 'billing_payroll'
const DEFAULT_UI_FEATURES: BillingUiFeatures = {
  searchBar: false,
  themeSwitcher: false,
  globalAdd: false,
  appSwitcher: false,
  orgSwitcher: false,
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
  if (evaluateError || !evaluateResult)
    return {
      uiFeatures: DEFAULT_UI_FEATURES,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
      widgets: { notepad: false },
    }

  const enabledSlugs = new Set(
    evaluateResult.data.map((feature) => feature.slug)
  )
  const sales = enabledSlugs.has(BILLING_SALES_SLUG)
  const purchases = enabledSlugs.has(BILLING_PURCHASES_SLUG)

  return {
    uiFeatures: {
      searchBar: enabledSlugs.has(BILLING_SEARCH_BAR_SLUG),
      themeSwitcher: enabledSlugs.has(BILLING_THEME_SWITCHER_SLUG),
      globalAdd: enabledSlugs.has(BILLING_GLOBAL_ADD_SLUG),
      appSwitcher: enabledSlugs.has(BILLING_APP_SWITCHER_SLUG),
      orgSwitcher: enabledSlugs.has(BILLING_ORG_SWITCHER_SLUG),
    },
    productFeatures: {
      sales,
      quotes: sales && enabledSlugs.has(BILLING_SALES_QUOTES_SLUG),
      estimates: sales && enabledSlugs.has(BILLING_SALES_ESTIMATES_SLUG),
      invoices: sales && enabledSlugs.has(BILLING_SALES_INVOICES_SLUG),
      subscriptions: enabledSlugs.has(BILLING_SUBSCRIPTIONS_SLUG),
      purchases,
      vendors: purchases && enabledSlugs.has(BILLING_PURCHASES_VENDORS_SLUG),
      expenses: purchases && enabledSlugs.has(BILLING_PURCHASES_EXPENSES_SLUG),
      banking: enabledSlugs.has(BILLING_BANKING_SLUG),
      documents: enabledSlugs.has(BILLING_DOCUMENTS_SLUG),
      payroll: enabledSlugs.has(BILLING_PAYROLL_SLUG),
    },
    widgets: {
      notepad: isWidgetEnabled(notepadWidgetMetadata, 'billing', enabledSlugs),
    },
  }
})
