import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
import { readCustomFieldValue } from './field-values.js'

type Timestamp = bigint | number

export type ProjectCustomFieldRow = {
  id: string
  tenantId: string
  key: string
  label: string
  fieldType: string
  options: unknown
  required: boolean
  description: string | null
  position: number
  archivedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ProjectCustomFieldValueRow = {
  id: string
  tenantId: string
  projectId: string
  fieldId: string
  stringValue: string | null
  integerValue: number | null
  decimalValue: { toString(): string } | null
  booleanValue: boolean | null
  dateValue: Timestamp | null
  selectKey: string | null
  selectKeys: string[]
  updatedBy: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  field: { key: string; fieldType: string }
}

export type SerializedProjectCustomField = {
  object: 'projects.project-custom-field'
  id: string
  tenantId: string
  key: string
  label: string
  fieldType: string
  options: unknown
  required: boolean
  description: string | null
  position: number
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}

export type SerializedProjectCustomFieldValue = {
  object: 'projects.project-custom-field-value'
  id: string
  tenantId: string
  projectId: string
  fieldId: string
  fieldKey: string
  fieldType: string
  value: string | number | boolean | string[] | null
  updatedBy: string | null
  createdAt: number
  updatedAt: number
}

export type SerializedProjectCustomFieldTombstone = {
  object: 'projects.project-custom-field'
  id: string
  deleted: true
}

export function serializeProjectCustomField(
  row: ProjectCustomFieldRow
): SerializedProjectCustomField {
  return {
    object: 'projects.project-custom-field',
    id: row.id,
    tenantId: row.tenantId,
    key: row.key,
    label: row.label,
    fieldType: row.fieldType,
    options: row.options,
    required: row.required,
    description: row.description,
    position: row.position,
    archivedAt: nullableFromDbUnixSeconds(row.archivedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeProjectCustomFieldValue(
  row: ProjectCustomFieldValueRow
): SerializedProjectCustomFieldValue {
  return {
    object: 'projects.project-custom-field-value',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    fieldId: row.fieldId,
    fieldKey: row.field.key,
    fieldType: row.field.fieldType,
    value: readCustomFieldValue(row),
    updatedBy: row.updatedBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
