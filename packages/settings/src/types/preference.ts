export type PreferenceValueType =
  | 'boolean'
  | 'string'
  | 'enum'
  | 'integer'
  | 'decimal'
  | 'reference'

/** A decimal is carried as a string end-to-end — never a JS number — so money
 * and rate values never lose precision. */
export type PreferenceValue = boolean | string | number

export interface PreferenceOption {
  value: string
  label: string
}

interface PreferenceBase {
  /** snake_case, unique within its module. */
  key: string
  label: string
  /** One short line of helper text, or omitted. Never a paragraph. */
  hint?: string
  /** When true the preference is shown but not editable by an org admin. */
  readOnly?: boolean
}

export type PreferenceDefinition =
  | (PreferenceBase & { type: 'boolean'; default: boolean })
  | (PreferenceBase & {
      type: 'string'
      default: string
      maxLength?: number
    })
  | (PreferenceBase & {
      type: 'enum'
      default: string
      options: PreferenceOption[]
    })
  | (PreferenceBase & {
      type: 'integer'
      default: number
      min?: number
      max?: number
    })
  | (PreferenceBase & {
      type: 'decimal'
      default: string
      min?: string
      max?: string
    })
  | (PreferenceBase & {
      type: 'reference'
      default: string
      namespace: string
    })

/** The storage-facing row shape every consuming app persists. Column names are
 * camelCase here; an app maps them to its own snake_case columns. */
export interface StoredPreferenceRow {
  module: string
  key: string
  valueType: PreferenceValueType
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  referenceNamespace: string | null
  referenceKey: string | null
}

/** Fully-resolved preferences for one module: every declared key present. */
export type ResolvedModulePreferences = Record<string, PreferenceValue>
