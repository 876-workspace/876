import { preferenceSchema } from './schema'
import type {
  PreferenceDefinition,
  PreferenceValue,
  StoredPreferenceRow,
} from '../types'

export interface PreferenceError {
  code: string
  message: string
  param?: string
}

export type EncodePreferenceResult =
  | { data: StoredPreferenceRow; error: null }
  | { data: null; error: PreferenceError }

/**
 * Encodes one value into its storage row. `module` is required because a row is
 * only addressable as `(tenant, module, key)` — an encoder that did not know its
 * module could only ever emit an incomplete row for the caller to patch up.
 */
export function encodePreference(
  def: PreferenceDefinition,
  value: PreferenceValue,
  module: string
): EncodePreferenceResult {
  const parsed = preferenceSchema(def).safeParse(value)
  if (!parsed.success)
    return {
      data: null,
      error: {
        code: 'settings/invalid-preference',
        message:
          parsed.error.issues[0]?.message ?? `Invalid value for ${def.key}`,
        param: def.key,
      },
    }

  const row: StoredPreferenceRow = {
    module,
    key: def.key,
    valueType: def.type,
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: null,
    referenceKey: null,
  }

  switch (def.type) {
    case 'boolean':
      row.booleanValue = value as boolean
      break
    case 'string':
    case 'enum':
      row.stringValue = value as string
      break
    case 'integer':
      row.integerValue = value as number
      break
    case 'decimal':
      row.decimalValue = value as string
      break
    case 'reference':
      row.referenceNamespace = def.namespace
      row.referenceKey = value as string
      break
  }

  return { data: row, error: null }
}

export function decodePreference(
  def: PreferenceDefinition,
  row: StoredPreferenceRow
): PreferenceValue {
  if (row.valueType !== def.type) return def.default

  switch (def.type) {
    case 'boolean':
      return row.booleanValue ?? def.default
    case 'string':
    case 'enum':
      return row.stringValue ?? def.default
    case 'integer':
      return row.integerValue ?? def.default
    case 'decimal':
      return row.decimalValue ?? def.default
    case 'reference':
      if (row.referenceNamespace !== def.namespace || row.referenceKey === null)
        return def.default

      return row.referenceKey
  }
}
