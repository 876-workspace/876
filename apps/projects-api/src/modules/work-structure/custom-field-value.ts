import { nullableFromDbUnixSeconds } from '../../platform/timestamps.js'

type Timestamp = bigint | number
type DecimalString = { toString(): string }

export type TypedCustomFieldValueRow = {
  stringValue: string | null
  integerValue: number | null
  decimalValue: DecimalString | null
  booleanValue: boolean | null
  dateValue: Timestamp | null
  selectKey: string | null
  selectKeys: string[]
  field: { fieldType: string }
}

export function readCustomFieldValue(
  row: TypedCustomFieldValueRow
): string | number | boolean | string[] | null {
  switch (row.field.fieldType) {
    case 'number':
      return row.integerValue
    case 'decimal':
      return row.decimalValue?.toString() ?? null
    case 'boolean':
      return row.booleanValue
    case 'date':
      return nullableFromDbUnixSeconds(row.dateValue)
    case 'select':
      return row.selectKey
    case 'multi-select':
      return row.selectKeys
    default:
      return row.stringValue
  }
}
