import type { WidgetMetadata } from '@876/widgets'

export interface ConsoleUiFeatures {
  themeSwitcher: boolean
  globalAdd: boolean
  appSwitcher: boolean
  searchBar: boolean
}

export interface ConsoleFeatures {
  enabledWidgetIds: string[]
  uiFeatures: ConsoleUiFeatures
}

export interface ConsoleFeatureRequest {
  userId?: string
  widgets: readonly WidgetMetadata[]
}
