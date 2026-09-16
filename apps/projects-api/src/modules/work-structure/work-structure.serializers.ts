import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
// Direct leaf import: field-values is pure, while the barrel pulls DB-backed modules.
import { readCustomFieldValue } from '../custom-fields/field-values.js'

type Timestamp = bigint | number
type DecimalString = { toString(): string }

export type WorkItemTypeRow = {
  id: string
  tenantId: string
  key: string
  name: string
  iconKey: string
  color: string
  hierarchyLevel: number
  description: string | null
  isDefault: boolean
  position: number
  archivedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
export type WorkflowStateRow = {
  id: string
  tenantId: string
  key: string
  name: string
  category: string
  color: string
  description: string | null
  isDefault: boolean
  position: number
  archivedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
export type MilestoneRow = {
  id: string
  tenantId: string
  projectId: string
  key: string
  name: string
  description: string | null
  status: string
  ownerUserId: string | null
  startDate: Timestamp | null
  targetDate: Timestamp | null
  completedAt: Timestamp | null
  position: number
  clientVisible: boolean
  deletedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
export type CustomFieldRow = {
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
  types?: Array<{ typeId: string }>
}
export type CustomFieldValueRow = {
  id: string
  tenantId: string
  issueId: string
  fieldId: string
  stringValue: string | null
  integerValue: number | null
  decimalValue: DecimalString | null
  booleanValue: boolean | null
  dateValue: Timestamp | null
  selectKey: string | null
  selectKeys: string[]
  updatedBy: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  field: CustomFieldRow
}

export type SerializedWorkItemType = {
  object: 'projects.work-item-type'
  id: string
  tenantId: string
  key: string
  name: string
  iconKey: string
  color: string
  hierarchyLevel: number
  description: string | null
  isDefault: boolean
  position: number
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}
export type SerializedWorkflowState = {
  object: 'projects.workflow-state'
  id: string
  tenantId: string
  key: string
  name: string
  category: string
  color: string
  description: string | null
  isDefault: boolean
  position: number
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}
export type SerializedMilestone = {
  object: 'projects.milestone'
  id: string
  tenantId: string
  projectId: string
  key: string
  name: string
  description: string | null
  status: string
  ownerUserId: string | null
  startDate: number | null
  targetDate: number | null
  completedAt: number | null
  position: number
  createdAt: number
  updatedAt: number
}
export type SerializedCustomField = {
  object: 'projects.custom-field'
  id: string
  tenantId: string
  key: string
  label: string
  fieldType: string
  options: unknown
  required: boolean
  description: string | null
  position: number
  typeIds: string[]
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}
export type SerializedCustomFieldValue = {
  object: 'projects.custom-field-value'
  id: string
  tenantId: string
  issueId: string
  fieldId: string
  fieldKey: string
  fieldType: string
  value: string | number | boolean | string[] | null
  updatedBy: string | null
  createdAt: number
  updatedAt: number
}

export function serializeWorkItemType(
  row: WorkItemTypeRow
): SerializedWorkItemType {
  return {
    object: 'projects.work-item-type',
    id: row.id,
    tenantId: row.tenantId,
    key: row.key,
    name: row.name,
    iconKey: row.iconKey,
    color: row.color,
    hierarchyLevel: row.hierarchyLevel,
    description: row.description,
    isDefault: row.isDefault,
    position: row.position,
    archivedAt: nullableFromDbUnixSeconds(row.archivedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeWorkflowState(
  row: WorkflowStateRow
): SerializedWorkflowState {
  return {
    object: 'projects.workflow-state',
    id: row.id,
    tenantId: row.tenantId,
    key: row.key,
    name: row.name,
    category: row.category,
    color: row.color,
    description: row.description,
    isDefault: row.isDefault,
    position: row.position,
    archivedAt: nullableFromDbUnixSeconds(row.archivedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeMilestone(row: MilestoneRow): SerializedMilestone {
  return {
    object: 'projects.milestone',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    key: row.key,
    name: row.name,
    description: row.description,
    status: row.status,
    ownerUserId: row.ownerUserId,
    startDate: nullableFromDbUnixSeconds(row.startDate),
    targetDate: nullableFromDbUnixSeconds(row.targetDate),
    completedAt:
      row.status === 'completed'
        ? nullableFromDbUnixSeconds(row.completedAt)
        : null,
    position: row.position,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeCustomField(
  row: CustomFieldRow
): SerializedCustomField {
  return {
    object: 'projects.custom-field',
    id: row.id,
    tenantId: row.tenantId,
    key: row.key,
    label: row.label,
    fieldType: row.fieldType,
    options: row.options,
    required: row.required,
    description: row.description,
    position: row.position,
    typeIds: row.types?.map((type) => type.typeId) ?? [],
    archivedAt: nullableFromDbUnixSeconds(row.archivedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeCustomFieldValue(
  row: CustomFieldValueRow
): SerializedCustomFieldValue {
  return {
    object: 'projects.custom-field-value',
    id: row.id,
    tenantId: row.tenantId,
    issueId: row.issueId,
    fieldId: row.fieldId,
    fieldKey: row.field.key,
    fieldType: row.field.fieldType,
    value: readCustomFieldValue(row),
    updatedBy: row.updatedBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
