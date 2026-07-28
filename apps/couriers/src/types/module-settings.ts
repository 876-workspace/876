import type {
  ModuleDefinition,
  ResolvedModulePreferences,
  StoredPreferenceRow,
} from '@876/settings'

export type { ModuleDefinition, ResolvedModulePreferences, StoredPreferenceRow }

export interface ModuleStateListParams {
  tenantId: string
}

export interface ModulePreferenceListParams {
  tenantId: string
  module?: string
}

export interface ModulePreferenceUpdateParams {
  tenantId: string
  module: string
  /** Partial patch: only the keys being changed. */
  values: Record<string, boolean | string | number>
  updatedBy?: string
}

export interface ModuleToggleParams {
  tenantId: string
  module: string
  isEnabled: boolean
}
