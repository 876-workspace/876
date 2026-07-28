import { moduleDefaults } from '../catalog'
import { decodePreference, encodePreference } from './encode'
import type {
  ModuleCatalog,
  ModuleDefinition,
  PreferenceValue,
  ResolvedModulePreferences,
  StoredPreferenceRow,
} from '../types'

export function resolveModulePreferences(
  module: ModuleDefinition,
  rows: StoredPreferenceRow[]
): ResolvedModulePreferences {
  const resolved = moduleDefaults(module)

  for (const row of rows) {
    if (row.module !== module.key) continue

    const preference = module.preferences.find(
      (candidate) => candidate.key === row.key
    )
    if (!preference) continue

    resolved[preference.key] = decodePreference(preference, row)
  }

  return resolved
}

export function resolveCatalogPreferences(
  catalog: ModuleCatalog,
  rows: StoredPreferenceRow[]
): Record<string, ResolvedModulePreferences> {
  return Object.fromEntries(
    catalog.map((module) => [
      module.key,
      resolveModulePreferences(module, rows),
    ])
  )
}

export function diffPreferences(
  module: ModuleDefinition,
  current: ResolvedModulePreferences,
  patch: Record<string, PreferenceValue>
): StoredPreferenceRow[] {
  const rows: StoredPreferenceRow[] = []

  for (const [key, value] of Object.entries(patch)) {
    const preference = module.preferences.find(
      (candidate) => candidate.key === key
    )
    if (!preference || Object.is(current[key], value)) continue

    const encoded = encodePreference(preference, value, module.key)
    if (!encoded.data) continue

    rows.push(encoded.data)
  }

  return rows
}
