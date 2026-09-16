import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import {
  buildCustomFieldValueData,
  customFieldOptionKeys,
  missingRequiredFieldKey,
} from '../custom-fields/field-values.js'
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
import * as automation from '../automation/index.js'
import * as collaboration from '../collaboration/index.js'
import * as layouts from '../layouts/index.js'
import * as core from './work-structure.service.js'
import * as structureRepository from './work-structure.repository.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

class MilestoneMutationError extends Error {
  constructor(readonly projectsError: ProjectsError) {
    super(projectsError.message)
  }
}

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

function milestoneLayoutIncoming(
  body: CreateMilestoneWithActorBody | UpdateMilestoneWithActorBody
): layouts.LayoutFieldInput {
  const incoming: layouts.LayoutFieldInput = {}
  if (body.name !== undefined) incoming.title = body.name
  if (body.description !== undefined)
    incoming.description = body.description
  if (body.status !== undefined) incoming.state = body.status
  if (body.ownerUserId !== undefined) incoming.assignee = body.ownerUserId
  if (body.startDate !== undefined) incoming.startDate = body.startDate
  if (body.targetDate !== undefined) incoming.dueDate = body.targetDate
  return incoming
}

export async function createMilestone(
  organizationId: string,
  body: CreateMilestoneWithActorBody
) {
  const { actorUserId, ...input } = body
  const layoutCheck = await layouts.enforceLayoutRules({
    organizationId,
    entity: 'phase',
    existing: {},
    incoming: milestoneLayoutIncoming(body),
  })
  if (layoutCheck.error) return { data: null, error: layoutCheck.error }
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

  const createdMentioned = milestone.description
    ? collaboration.mentionedUserIds(milestone.description, actorUserId ?? null)
    : []
  await collaboration.ensureFollowsForTenant(milestone.tenantId, [
    ...(actorUserId
      ? [{ subjectType: 'phase', subjectId: milestone.id, userId: actorUserId }]
      : []),
    ...(milestone.ownerUserId
      ? [
          {
            subjectType: 'phase',
            subjectId: milestone.id,
            userId: milestone.ownerUserId,
          },
        ]
      : []),
    ...createdMentioned.map((userId) => ({
      subjectType: 'phase' as const,
      subjectId: milestone.id,
      userId,
    })),
  ])
  await collaboration.notifyMentionedUsers({
    tenantId: milestone.tenantId,
    userIds: createdMentioned,
    subjectType: 'phase',
    subjectId: milestone.id,
    title: `You were mentioned in ${milestone.name}`,
  })
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
  const storedValues = await listCustomFieldValues(organizationId, id)
  if (storedValues.error) return { data: null, error: storedValues.error }
  const storedCustomFields: layouts.LayoutFieldInput = {}
  for (const value of storedValues.data)
    storedCustomFields[`cf:${value.fieldKey}`] = value.value
  const layoutCheck = await layouts.enforceLayoutRules({
    organizationId,
    entity: 'phase',
    existing: {
      title: before.milestone.name,
      description: before.milestone.description,
      state: before.milestone.status,
      assignee: before.milestone.ownerUserId,
      startDate: before.milestone.startDate,
      dueDate: before.milestone.targetDate,
      ...storedCustomFields,
    },
    incoming: milestoneLayoutIncoming(body),
  })
  if (layoutCheck.error) return { data: null, error: layoutCheck.error }
  let updated: Awaited<ReturnType<typeof core.updateMilestone>>
  try {
    updated = await structureRepository.transaction(async (tx) => {
      const result = await core.updateMilestone(organizationId, id, input, {
        client: tx.client,
      })
      if (result.error || !result.data)
        throw new MilestoneMutationError(
          result.error ?? getError('projects/milestone-not-found')
        )
      if (
        before.milestone.status !== 'completed' &&
        result.data.status === 'completed'
      ) {
        await automation.appendOutboxEvent(tx.client, {
          tenantId: result.data.tenantId,
          type: 'phase.completed',
          subjectType: 'phase',
          subjectId: result.data.id,
          payload: {
            organizationId,
            projectId: result.data.projectId,
            milestoneId: result.data.id,
          },
          causationDepth: 0,
        })
      }
      return result
    })
  } catch (error) {
    if (error instanceof MilestoneMutationError)
      return { data: null, error: error.projectsError }
    throw error
  }
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

  const ownerChanged =
    input.ownerUserId !== undefined &&
    input.ownerUserId !== before.milestone.ownerUserId;
  const updatedMentioned =
    input.description !== undefined && input.description !== null
      ? collaboration.mentionedUserIds(input.description, actorUserId ?? null)
      : [];
  await collaboration.ensureFollowsForTenant(updated.data.tenantId, [
    ...(ownerChanged && input.ownerUserId
      ? [
          {
            subjectType: 'phase',
            subjectId: updated.data.id,
            userId: input.ownerUserId,
          },
        ]
      : []),
    ...updatedMentioned.map((userId) => ({
      subjectType: 'phase' as const,
      subjectId: updated.data.id,
      userId,
    })),
  ])
  await collaboration.notifyMentionedUsers({
    tenantId: updated.data.tenantId,
    userIds: updatedMentioned,
    subjectType: 'phase',
    subjectId: updated.data.id,
    title: `You were mentioned in ${updated.data.name}`,
  })
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
  const commentMentioned = collaboration.mentionedUserIds(
    body.body,
    body.authorUserId
  )
  await collaboration.ensureFollowsForTenant(resolved.milestone.tenantId, [
    { subjectType: 'phase', subjectId: id, userId: body.authorUserId },
    ...commentMentioned.map((userId) => ({
      subjectType: 'phase' as const,
      subjectId: id,
      userId,
    })),
  ])
  await collaboration.notifyMentionedUsers({
    tenantId: resolved.milestone.tenantId,
    userIds: commentMentioned,
    subjectType: 'phase',
    subjectId: id,
    title: `You were mentioned in ${resolved.milestone.name}`,
  })
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
  if (isOptionType && customFieldOptionKeys(nextOptions).length === 0)
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
    const parsed = buildCustomFieldValueData(field, input.value)
    if (parsed.error) return parsed
  }
  const missingKey = missingRequiredFieldKey(
    fields,
    body.customFields,
    new Set<string>()
  )
  if (missingKey)
    return {
      data: null,
      error: getError('projects/required-custom-field-missing', {
        param: missingKey,
      }),
    }

  const timestamp = now()
  for (const input of body.customFields) {
    const field = byId.get(input.fieldId)
    if (!field) continue
    const parsed = buildCustomFieldValueData(field, input.value)
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

export async function listVisibleMilestoneComments(
  organizationId: string,
  id: string
) {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  const rows = await details.listMilestoneComments(
    resolved.milestone.tenantId,
    id
  )
  return {
    data: (rows as MilestoneCommentRow[]).filter(
      (row) => row.clientVisible
    ),
    error: null,
  }
}

export async function setMilestoneCommentVisibility(
  organizationId: string,
  id: string,
  commentId: string,
  clientVisible: boolean
): Promise<
  ServiceResult<{ object: string; id: string; clientVisible: boolean }>
> {
  const resolved = await resolveMilestone(organizationId, id)
  if (resolved.error || !resolved.milestone)
    return { data: null, error: resolved.error ?? getError('projects/milestone-not-found') }
  const existing = await details.retrieveMilestoneComment(
    resolved.milestone.tenantId,
    id,
    commentId
  )
  if (!existing)
    return { data: null, error: getError('projects/comment-not-found') }
  const updated = await details.setMilestoneCommentVisibility(
    existing.id,
    clientVisible,
    now()
  )
  return {
    data: {
      object: 'projects.milestone-comment',
      id: (updated as MilestoneCommentRow).id,
      clientVisible: (updated as MilestoneCommentRow).clientVisible,
    },
    error: null,
  }
}
