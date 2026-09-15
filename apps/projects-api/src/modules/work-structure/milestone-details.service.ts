import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as tenants from '../tenants/index.js'
import * as details from './milestone-details.repository.js'
import {
  serializeMilestoneComment,
  serializeMilestoneCustomField,
  serializeMilestoneCustomFieldValue,
  serializeMilestoneEvent,
  type MilestoneCommentRow,
  type MilestoneCustomFieldRow,
  type MilestoneCustomFieldValueRow,
  type MilestoneEventRow,
} from './milestone-details.serializers.js'
import type {
  CloneMilestoneBody,
  CreateMilestoneCustomFieldBody,
  CreateMilestoneWithActorBody,
  SetMilestoneCustomFieldsBody,
  UpdateMilestoneCustomFieldBody,
  UpdateMilestoneWithActorBody,
} from './milestone-details.schemas.js'
import * as core from './work-structure.service.js'
import type { CustomFieldValueInput } from './work-structure.schemas.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant
    ? { tenant, error: null }
    : { tenant: null, error: getError('projects/tenant-not-found') }
}

async function resolveMilestone(organizationId: string, id: string) {
  const result = await core.retrieveMilestone(organizationId, id)
  return result.error || !result.data
    ? { milestone: null, error: result.error ?? getError('projects/milestone-not-found') }
    : { milestone: result.data, error: null }
}

async function addEvent(
  tenantId: string,
  milestoneId: string,
  actorUserId: string | null | undefined,
  type: string,
  fromValue: string | null = null,
  toValue: string | null = null
) {
  return details.createMilestoneEvent({
    id: generateId('milestoneEvent'),
    tenantId,
    milestoneId,
    actorUserId: actorUserId ?? null,
    type,
    fromValue,
    toValue,
    createdAt: now(),
  })
}

export async function createMilestone(
  organizationId: string,
  body: CreateMilestoneWithActorBody
) {
  const { actorUserId, ...input } = body
  const created = await core.createMilestone(organizationId, input)
  if (created.error || !created.data) return created

  let milestone = created.data
  if (input.ownerUserId !== undefined) {
    const withOwner = await core.updateMilestone(organizationId, milestone.id, {
      ownerUserId: input.ownerUserId,
    })
    if (withOwner.error || !withOwner.data) return withOwner
    milestone = withOwner.data
  }

  await addEvent(
    milestone.tenantId,
    milestone.id,
    actorUserId,
    'created',
    null,
    milestone.key
  )
  return { data: milestone, error: null }
}

export async function updateMilestone(
  organizationId: string,
  id: string,
  body: UpdateMilestoneWithActorBody
) {
  const before = await resolveMilestone(organizationId, id)
  if (before.error || !before.milestone)
    return { data: null, error: before.error ?? getError('projects/milestone-not-found') }

  const { actorUserId, ...input } = body
  const updated = await core.updateMilestone(organizationId, id, input)
  if (updated.error || !updated.data) return updated

  const statusChanged = before.milestone.status !== updated.data.status
  await addEvent(
    updated.data.tenantId,
    updated.data.id,
    actorUserId,
    statusChanged ? 'status-changed' : 'updated',
    statusChanged ? before.milestone.status : null,
    statusChanged ? updated.data.status : null
  )
  return updated
}

export async function milestoneSummary(organizationId: string, id: string) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }

  const progress = await details.milestoneProgress(
    resolved.milestone.tenantId,
    resolved.milestone.id
  )
  return {
    data: {
      object: 'projects.milestone-summary' as const,
      milestoneId: resolved.milestone.id,
      issueCount: progress.total,
      completedIssueCount: progress.completed,
      progressPercent:
        progress.total === 0
          ? 0
          : Math.round((progress.completed / progress.total) * 100),
    },
    error: null,
  }
}

export async function listComments(organizationId: string, id: string) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  return {
    data: (
      await details.listMilestoneComments(resolved.milestone.tenantId, id)
    ).map((row) => serializeMilestoneComment(row as MilestoneCommentRow)),
    error: null,
  }
}

export async function createComment(
  organizationId: string,
  id: string,
  body: { body: string; authorUserId: string }
) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  const timestamp = now()
  const row = await details.createMilestoneComment({
    id: generateId('comment'),
    tenantId: resolved.milestone.tenantId,
    milestoneId: id,
    authorUserId: body.authorUserId,
    body: body.body,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await addEvent(
    resolved.milestone.tenantId,
    id,
    body.authorUserId,
    'comment-added'
  )
  return { data: serializeMilestoneComment(row as MilestoneCommentRow), error: null }
}

export async function updateComment(
  organizationId: string,
  id: string,
  commentId: string,
  body: { body: string; actorUserId: string }
) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  const existing = await details.retrieveMilestoneComment(
    resolved.milestone.tenantId,
    id,
    commentId
  )
  if (!existing) return { data: null, error: getError('projects/comment-not-found') }
  if (existing.authorUserId !== body.actorUserId)
    return { data: null, error: getError('projects/comment-not-owned') }
  const row = await details.updateMilestoneComment(commentId, body.body, now())
  await addEvent(
    resolved.milestone.tenantId,
    id,
    body.actorUserId,
    'comment-updated'
  )
  return { data: serializeMilestoneComment(row as MilestoneCommentRow), error: null }
}

export async function deleteComment(
  organizationId: string,
  id: string,
  commentId: string,
  actorUserId: string
) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  const existing = await details.retrieveMilestoneComment(
    resolved.milestone.tenantId,
    id,
    commentId
  )
  if (!existing) return { data: null, error: getError('projects/comment-not-found') }
  if (existing.authorUserId !== actorUserId)
    return { data: null, error: getError('projects/comment-not-owned') }
  await details.deleteMilestoneComment(commentId, now())
  await addEvent(
    resolved.milestone.tenantId,
    id,
    actorUserId,
    'comment-deleted'
  )
  return {
    data: { object: 'projects.milestone-comment' as const, id: commentId, deleted: true as const },
    error: null,
  }
}

export async function listEvents(organizationId: string, id: string) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  return {
    data: (
      await details.listMilestoneEvents(resolved.milestone.tenantId, id)
    ).map((row) => serializeMilestoneEvent(row as MilestoneEventRow)),
    error: null,
  }
}

export async function listCustomFields(organizationId: string) {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  return {
    data: (await details.listMilestoneCustomFields(resolved.tenant.id)).map(
      (row) => serializeMilestoneCustomField(row as MilestoneCustomFieldRow)
    ),
    error: null,
  }
}

export async function createCustomField(
  organizationId: string,
  body: CreateMilestoneCustomFieldBody
) {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (
    await details.retrieveMilestoneCustomFieldByKey(resolved.tenant.id, body.key)
  )
    return { data: null, error: getError('projects/custom-field-key-taken') }
  const timestamp = now()
  const row = await details.createMilestoneCustomField({
    id: generateId('customField'),
    tenantId: resolved.tenant.id,
    key: body.key,
    label: body.label,
    fieldType: body.fieldType,
    options: body.options ?? undefined,
    required: body.required ?? false,
    description: body.description ?? null,
    position: body.position ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: serializeMilestoneCustomField(row as MilestoneCustomFieldRow), error: null }
}

export async function updateCustomField(
  organizationId: string,
  fieldId: string,
  body: UpdateMilestoneCustomFieldBody
) {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await details.retrieveMilestoneCustomField(
    resolved.tenant.id,
    fieldId
  )
  if (!existing)
    return { data: null, error: getError('projects/custom-field-not-found') }
  const nextType = body.fieldType ?? existing.fieldType
  const nextOptions = body.options ?? existing.options
  const isOptionType = nextType === 'select' || nextType === 'multi-select'
  if (isOptionType && optionKeys(nextOptions).length === 0)
    return { data: null, error: getError('projects/invalid-request') }
  if (!isOptionType && body.options !== undefined)
    return { data: null, error: getError('projects/invalid-request') }
  const row = await details.updateMilestoneCustomField(fieldId, {
    ...body,
    updatedAt: now(),
  })
  return { data: serializeMilestoneCustomField(row as MilestoneCustomFieldRow), error: null }
}

export async function deleteCustomField(
  organizationId: string,
  fieldId: string
) {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await details.retrieveMilestoneCustomField(
    resolved.tenant.id,
    fieldId
  )
  if (!existing)
    return { data: null, error: getError('projects/custom-field-not-found') }
  await details.archiveMilestoneCustomField(fieldId, now())
  return {
    data: { object: 'projects.milestone-custom-field' as const, id: fieldId, deleted: true as const },
    error: null,
  }
}

function optionKeys(options: unknown): string[] {
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

function isEmpty(value: CustomFieldValueInput['value']) {
  return value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

function valueData(
  field: { fieldType: string; options: unknown },
  value: CustomFieldValueInput['value']
): ServiceResult<{
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  dateValue: bigint | null
  selectKey: string | null
  selectKeys: string[]
} | null> {
  const empty = {
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    dateValue: null,
    selectKey: null,
    selectKeys: [] as string[],
  }
  if (isEmpty(value)) return { data: null, error: null }
  if (
    ['text', 'textarea', 'user', 'url'].includes(field.fieldType) &&
    typeof value === 'string'
  )
    return { data: { ...empty, stringValue: value }, error: null }
  if (field.fieldType === 'number' && typeof value === 'number' && Number.isInteger(value))
    return { data: { ...empty, integerValue: value }, error: null }
  if (field.fieldType === 'decimal' && typeof value === 'string' && /^-?\d+(?:\.\d{1,6})?$/.test(value))
    return { data: { ...empty, decimalValue: value }, error: null }
  if (field.fieldType === 'boolean' && typeof value === 'boolean')
    return { data: { ...empty, booleanValue: value }, error: null }
  if (field.fieldType === 'date' && typeof value === 'number' && Number.isInteger(value))
    return { data: { ...empty, dateValue: BigInt(value) }, error: null }
  const keys = optionKeys(field.options)
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
  return { data: null, error: getError('projects/custom-field-value-invalid') }
}

export async function listCustomFieldValues(
  organizationId: string,
  id: string
) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  return {
    data: (
      await details.listMilestoneCustomFieldValues(resolved.milestone.tenantId, id)
    ).map((row) =>
      serializeMilestoneCustomFieldValue(row as MilestoneCustomFieldValueRow)
    ),
    error: null,
  }
}

export async function setCustomFieldValues(
  organizationId: string,
  id: string,
  body: SetMilestoneCustomFieldsBody
) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  const fields = await details.listMilestoneCustomFields(resolved.milestone.tenantId)
  const byId = new Map(fields.map((field) => [field.id, field]))
  const seen = new Set<string>()
  for (const input of body.customFields) {
    if (seen.has(input.fieldId))
      return { data: null, error: getError('projects/invalid-request') }
    seen.add(input.fieldId)
    const field = byId.get(input.fieldId)
    if (!field)
      return { data: null, error: getError('projects/custom-field-not-found') }
    const parsed = valueData(field, input.value)
    if (parsed.error) return parsed
  }
  for (const field of fields) {
    if (!field.required) continue
    const input = body.customFields.find((item) => item.fieldId === field.id)
    if (!input || isEmpty(input.value))
      return {
        data: null,
        error: getError('projects/required-custom-field-missing', {
          param: field.key,
        }),
      }
  }

  const timestamp = now()
  for (const input of body.customFields) {
    const field = byId.get(input.fieldId)
    if (!field) continue
    const parsed = valueData(field, input.value)
    if (parsed.error) return parsed
    if (!parsed.data) {
      await details.clearMilestoneCustomFieldValue(
        resolved.milestone.tenantId,
        id,
        field.id
      )
      continue
    }
    await details.upsertMilestoneCustomFieldValue({
      id: generateId('customFieldValue'),
      tenantId: resolved.milestone.tenantId,
      milestoneId: id,
      fieldId: field.id,
      ...parsed.data,
      updatedBy: body.updatedBy ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }
  await addEvent(
    resolved.milestone.tenantId,
    id,
    body.updatedBy,
    'custom-fields-updated'
  )
  return listCustomFieldValues(organizationId, id)
}

export async function cloneMilestone(
  organizationId: string,
  id: string,
  body: CloneMilestoneBody
) {
  const source = await resolveMilestone(organizationId, id)
  if (source.error || !source.milestone)
    return { data: null, error: source.error ?? getError('projects/milestone-not-found') }
  const created = await createMilestone(organizationId, {
    projectId: source.milestone.projectId,
    key: body.key,
    name: body.name,
    description: source.milestone.description,
    status: 'open',
    ownerUserId: source.milestone.ownerUserId,
    startDate: source.milestone.startDate,
    targetDate: source.milestone.targetDate,
    position: source.milestone.position,
    actorUserId: body.actorUserId,
  })
  if (created.error || !created.data) return created

  const values = await listCustomFieldValues(organizationId, source.milestone.id)
  if (values.error) return { data: null, error: values.error }
  if (values.data.length > 0) {
    const copied = await setCustomFieldValues(organizationId, created.data.id, {
      customFields: values.data.map((value) => ({
        fieldId: value.fieldId,
        value: value.value,
      })),
      updatedBy: body.actorUserId,
    })
    if (copied.error) return { data: null, error: copied.error }
  }
  return created
}
