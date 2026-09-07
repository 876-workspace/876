export interface InvoiceUiFeatures {
  searchBar: boolean
  themeSwitcher: boolean
  globalAdd: boolean
  appSwitcher: boolean
  orgSwitcher: boolean
}

export interface InvoiceFeatures {
  featureKeys: string[]
  uiFeatures: InvoiceUiFeatures
}

export interface InvoiceFeatureRequest {
  userId?: string
  organizationId?: string
}
