export {
  defineModuleCatalog,
  findModule,
  findPreference,
  moduleDefaults,
} from './catalog'
export {
  defineSettingsNav,
  filterSettingsNav,
  resolveSettingsHref,
  settingsNavSections,
} from './nav/registry'
export { decodePreference, encodePreference } from './preferences/encode'
export type {
  EncodePreferenceResult,
  PreferenceError,
} from './preferences/encode'
export {
  diffPreferences,
  resolveCatalogPreferences,
  resolveModulePreferences,
} from './preferences/resolve'
export { moduleUpdateSchema, preferenceSchema } from './preferences/schema'
export { evaluateSetup } from './readiness/evaluate'
export type * from './types'
