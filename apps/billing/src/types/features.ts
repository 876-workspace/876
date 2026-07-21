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
  estimates: boolean
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
  uiFeatures: BillingUiFeatures
  productFeatures: BillingProductFeatures
  widgets: {
    notepad: boolean
  }
}
