import type { PreferenceDefinition } from './preference'

export interface ModuleDefinition {
  /** snake_case module key. MUST match the app's permission-catalog module key
   * where one exists, so `<module>.view` gates the module's settings page. */
  key: string
  label: string
  /** When false the org cannot turn this module off (it is structural). */
  optional: boolean
  /** Default enabled state for a newly provisioned organization. */
  enabledByDefault: boolean
  preferences: PreferenceDefinition[]
}

export type ModuleCatalog = readonly ModuleDefinition[]

/** Per-org enable/disable state, independent of preference values. */
export interface ModuleState {
  module: string
  isEnabled: boolean
}
