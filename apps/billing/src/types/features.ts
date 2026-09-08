import type { WidgetId } from '@876/widgets'

export interface BillingUiFeatures {
  searchBar: boolean
  themeSwitcher: boolean
  globalAdd: boolean
  appSwitcher: boolean
  orgSwitcher: boolean
  chat: boolean
}

export interface BillingProductFeatures {
  sales: boolean
  quotes: boolean
  invoices: boolean
  subscriptions: boolean
  purchases: boolean
  vendors: boolean
  expenses: boolean
  banking: boolean
  documents: boolean
  payroll: boolean
}

export type BillingProductFeature = keyof BillingProductFeatures

export interface BillingFeatures {
  featureKeys: string[]
  uiFeatures: BillingUiFeatures
  productFeatures: BillingProductFeatures
  widgets: {
    enabledWidgetIds: WidgetId[]
  }
}
