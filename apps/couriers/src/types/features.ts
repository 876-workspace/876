export interface CouriersFeatures {
  uiFeatures: {
    searchBar: boolean
    themeSwitcher: boolean
    globalAdd: boolean
    appSwitcher: boolean
    orgSwitcher: boolean
  }
  enabledWidgetIds: string[]
}

export interface CouriersFeatureRequest {
  userId: string
  organizationId: string
}
