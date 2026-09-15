import { fromDbUnixSeconds } from '../../platform/timestamps.js'
import { readCustomFieldValue } from './custom-field-value.js'
import type { CustomFieldRow } from './work-structure.serializers.js'

type Timestamp = bigint | number
type DecimalString = { toString(): string }

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
  field: CustomFieldRow
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
