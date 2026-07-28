import { compareDecimalStrings, preferenceSchema } from './preferences/schema'
import type {
  ModuleCatalog,
  ModuleDefinition,
  PreferenceDefinition,
  ResolvedModulePreferences,
} from './types'

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/

export function defineModuleCatalog(
  modules: ModuleDefinition[]
): ModuleCatalog {
  const moduleKeys = new Set<string>()

  for (const module of modules) {
    if (!KEY_PATTERN.test(module.key))
      throw new Error(`Invalid module key: ${module.key}`)
    if (moduleKeys.has(module.key))
      throw new Error(`Duplicate module key: ${module.key}`)

    moduleKeys.add(module.key)
    validatePreferences(module)
    Object.freeze(module.preferences)
    Object.freeze(module)
  }

  return Object.freeze(modules)
}

export function findModule(
  catalog: ModuleCatalog,
  key: string
): ModuleDefinition | undefined {
  return catalog.find((module) => module.key === key)
}

export function findPreference(
  catalog: ModuleCatalog,
  moduleKey: string,
  key: string
): PreferenceDefinition | undefined {
  return findModule(catalog, moduleKey)?.preferences.find(
    (preference) => preference.key === key
  )
}

export function moduleDefaults(
  module: ModuleDefinition
): ResolvedModulePreferences {
  return Object.fromEntries(
    module.preferences.map((preference) => [preference.key, preference.default])
  )
}

function validatePreferences(module: ModuleDefinition): void {
  const preferenceKeys = new Set<string>()

  for (const preference of module.preferences) {
    if (!KEY_PATTERN.test(preference.key))
      throw new Error(
        `Invalid preference key in module ${module.key}: ${preference.key}`
      )
    if (preferenceKeys.has(preference.key))
      throw new Error(
        `Duplicate preference key in module ${module.key}: ${preference.key}`
      )

    preferenceKeys.add(preference.key)
    validateDefault(module.key, preference)

    if (preference.type === 'enum') {
      for (const option of preference.options) Object.freeze(option)
      Object.freeze(preference.options)
    }

    Object.freeze(preference)
  }
}

function validateDefault(
  moduleKey: string,
  preference: PreferenceDefinition
): void {
  if (
    preference.type === 'enum' &&
    !preference.options.some((option) => option.value === preference.default)
  )
    throw new Error(
      `Default for ${moduleKey}.${preference.key} is not an enum option`
    )

  if (
    preference.type === 'integer' &&
    ((preference.min !== undefined && preference.default < preference.min) ||
      (preference.max !== undefined && preference.default > preference.max))
  )
    throw new Error(
      `Default for ${moduleKey}.${preference.key} is outside its range`
    )

  if (
    preference.type === 'decimal' &&
    ((preference.min !== undefined &&
      compareDecimalStrings(preference.default, preference.min) < 0) ||
      (preference.max !== undefined &&
        compareDecimalStrings(preference.default, preference.max) > 0))
  )
    throw new Error(
      `Default for ${moduleKey}.${preference.key} is outside its range`
    )

  if (!preferenceSchema(preference).safeParse(preference.default).success)
    throw new Error(`Invalid default for ${moduleKey}.${preference.key}`)
}
