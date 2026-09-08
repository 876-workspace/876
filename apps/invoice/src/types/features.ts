import type { WidgetId } from '@876/widgets'

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
  widgets: {
    enabledWidgetIds: WidgetId[]
  }
}

export interface InvoiceFeatureRequest {
  userId?: string
  organizationId?: string
}
