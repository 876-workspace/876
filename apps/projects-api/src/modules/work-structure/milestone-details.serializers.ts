import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
// Direct leaf import: field-values is pure, while the barrel pulls DB-backed modules.
import { readCustomFieldValue } from '../custom-fields/field-values.js'

type Timestamp = bigint | number
type DecimalString = { toString(): string }

export type MilestoneCustomFieldRow = {
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

export type MilestoneCommentRow = {
  id: string
  tenantId: string
  milestoneId: string
  authorUserId: string | null
  body: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type MilestoneEventRow = {
  id: string
  milestoneId: string
  actorUserId: string | null
  type: string
  fromValue: string | null
  toValue: string | null
  createdAt: Timestamp
}

export type MilestoneCustomFieldValueRow = {
  id: string
  tenantId: string
  milestoneId: string
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
  field: MilestoneCustomFieldRow
}

export function serializeMilestoneCustomField(row: MilestoneCustomFieldRow) {
  return {
    object: 'projects.milestone-custom-field' as const,
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

export function serializeMilestoneComment(row: MilestoneCommentRow) {
  return {
    object: 'projects.milestone-comment' as const,
    id: row.id,
    milestoneId: row.milestoneId,
    authorUserId: row.authorUserId,
    body: row.body,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeMilestoneEvent(row: MilestoneEventRow) {
  return {
    object: 'projects.milestone-event' as const,
    id: row.id,
    milestoneId: row.milestoneId,
    actorUserId: row.actorUserId,
    type: row.type,
    fromValue: row.fromValue,
    toValue: row.toValue,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}

export function serializeMilestoneCustomFieldValue(
  row: MilestoneCustomFieldValueRow
) {
  return {
    object: 'projects.milestone-custom-field-value' as const,
    id: row.id,
    milestoneId: row.milestoneId,
    fieldId: row.fieldId,
    fieldKey: row.field.key,
    fieldType: row.field.fieldType,
    value: readCustomFieldValue(row),
    updatedBy: row.updatedBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
