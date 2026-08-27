export interface CrmUiFeatures {
  searchBar: boolean
  themeSwitcher: boolean
  globalAdd: boolean
  appSwitcher: boolean
  orgSwitcher: boolean
}

export interface CrmFeatures {
  uiFeatures: CrmUiFeatures
}

export interface CrmFeatureRequest {
  userId?: string
  organizationId?: string
}
