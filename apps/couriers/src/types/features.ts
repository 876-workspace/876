export interface CouriersFeatures {
  storageOrgLogoUpload: boolean
  uiFeatures: {
    searchBar: boolean
    themeSwitcher: boolean
    globalAdd: boolean
    appSwitcher: boolean
    orgSwitcher: boolean
    chat: boolean
  }
  enabledWidgetIds: string[]
}

export interface CouriersFeatureRequest {
  userId: string
  organizationId: string
}
