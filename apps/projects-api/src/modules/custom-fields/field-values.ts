import { getError, type ProjectsError } from '../../http/errors.js'

export type CustomFieldValue = string | number | boolean | string[] | null

export type FieldDefinition = {
  fieldType: string
  options: unknown
}

export type CustomFieldValueColumns = {
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  dateValue: bigint | null
  selectKey: string | null
  selectKeys: string[]
}

export type CustomFieldValueResult =
  | { data: CustomFieldValueColumns | null; error: null }
  | { data: null; error: ProjectsError }

export function customFieldOptionKeys(options: unknown): string[] {
  if (!Array.isArray(options)) return []
  return options.flatMap((option) =>
    typeof option === 'object' &&
    option !== null &&
    'key' in option &&
    typeof option.key === 'string'
      ? [option.key]
      : []
  )
}

export function isEmptyCustomFieldValue(value: CustomFieldValue): boolean {
  return (
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

/**
 * Maps an API custom field value onto its storage columns.
 *
 * A null result with no error means "clear the stored value". Select and
 * multi-select mismatches report option-invalid; every other type mismatch
 * reports value-invalid.
 */
export function buildCustomFieldValueData(
  field: FieldDefinition,
  value: CustomFieldValue
): CustomFieldValueResult {
  const empty: CustomFieldValueColumns = {
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    dateValue: null,
    selectKey: null,
    selectKeys: [],
  }
  if (isEmptyCustomFieldValue(value)) return { data: null, error: null }
  if (
    (field.fieldType === 'text' ||
      field.fieldType === 'textarea' ||
      field.fieldType === 'user' ||
      field.fieldType === 'url') &&
    typeof value === 'string'
  )
    return { data: { ...empty, stringValue: value }, error: null }
  if (
    field.fieldType === 'number' &&
    typeof value === 'number' &&
    Number.isInteger(value)
  )
    return { data: { ...empty, integerValue: value }, error: null }
  if (
    field.fieldType === 'decimal' &&
    typeof value === 'string' &&
    /^-?\d+(?:\.\d{1,6})?$/.test(value)
  )
    return { data: { ...empty, decimalValue: value }, error: null }
  if (field.fieldType === 'boolean' && typeof value === 'boolean')
    return { data: { ...empty, booleanValue: value }, error: null }
  if (
    field.fieldType === 'date' &&
    typeof value === 'number' &&
    Number.isInteger(value)
  )
    return { data: { ...empty, dateValue: BigInt(value) }, error: null }
  const keys = customFieldOptionKeys(field.options)
  if (field.fieldType === 'select' && typeof value === 'string')
    return keys.includes(value)
      ? { data: { ...empty, selectKey: value }, error: null }
      : { data: null, error: getError('projects/custom-field-option-invalid') }
  if (
    field.fieldType === 'multi-select' &&
    Array.isArray(value) &&
    value.every((key) => keys.includes(key))
  )
    return { data: { ...empty, selectKeys: value }, error: null }
  if (field.fieldType === 'select' || field.fieldType === 'multi-select')
    return {
      data: null,
      error: getError('projects/custom-field-option-invalid'),
    }
  return { data: null, error: getError('projects/custom-field-value-invalid') }
}

export type RequiredFieldCheck = {
  id: string
  key: string
  required: boolean
}

export type RequiredFieldInput = {
  fieldId: string
  value: CustomFieldValue
}

/**
 * Finds the key of the first required field left without a value.
 *
 * Inputs win over stored state: a required field counts as satisfied when
 * its input is non-empty, otherwise when it already has a stored value.
 */
export function missingRequiredFieldKey(
  fields: RequiredFieldCheck[],
  inputs: RequiredFieldInput[],
  existingFieldIds: ReadonlySet<string>
): string | null {
  const inputByFieldId = new Map(
    inputs.map((input) => [input.fieldId, input] as const)
  )
  for (const field of fields) {
    if (!field.required) continue
    const input = inputByFieldId.get(field.id)
    const hasValue = input
      ? !isEmptyCustomFieldValue(input.value)
      : existingFieldIds.has(field.id)
    if (!hasValue) return field.key
  }
  return null
}

export type StoredCustomFieldValueRow = {
  stringValue: string | null
  integerValue: number | null
  decimalValue: { toString(): string } | null
  booleanValue: boolean | null
  dateValue: bigint | number | null
  selectKey: string | null
  selectKeys: string[]
  field: { fieldType: string }
}

/**
 * Reads a stored custom field value row back onto its API representation.
 */
export function readCustomFieldValue(
  row: StoredCustomFieldValueRow
): string | number | boolean | string[] | null {
  switch (row.field.fieldType) {
    case 'number':
      return row.integerValue
    case 'decimal':
      return row.decimalValue?.toString() ?? null
    case 'boolean':
      return row.booleanValue
    case 'date':
      return row.dateValue === null || row.dateValue === undefined
        ? null
        : Number(row.dateValue)
    case 'select':
      return row.selectKey
    case 'multi-select':
      return row.selectKeys
    default:
      return row.stringValue
  }
}
