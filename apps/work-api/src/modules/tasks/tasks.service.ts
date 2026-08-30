import { getError, isError } from '@876/core'
import type {
  CreateWorkTaskInput,
  UpdateWorkTaskInput,
  WorkContext,
  WorkTask,
  WorkTaskAssignment,
  WorkTaskLink,
  WorkTaskStatus,
} from '@876/work'

import * as taskLists from '../task-lists/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './tasks.repository.js'

type TaskRow = Awaited<ReturnType<typeof repository.list>>[number]

type ListTaskFilter = {
  context?: WorkContext
  listId?: string
  parentTaskId?: string | null
  priorityId?: string
  assigneeId?: string
  status?: WorkTaskStatus
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

function fromUnixSeconds(seconds: number) {
  return new Date(seconds * 1000)
}
function serializeTimestamp(date: Date | null) {
  return date ? Math.floor(date.getTime() / 1000) : null
}
function serializeLink(link: TaskRow['links'][number]): WorkTaskLink {
  return {
    object: 'task_link',
    id: link.id,
    taskId: link.taskId,
    service: link.service,
    resource: link.resource,
    externalId: link.externalId,
    label: link.label,
    url: link.url,
    isPrimary: link.isPrimary,
    createdAt: serializeTimestamp(link.createdAt)!,
  }
}
function serializeAssignment(row: TaskRow['assignments'][number]): WorkTaskAssignment {
  return {
    object: 'task_assignment',
    id: row.id,
    taskId: row.taskId,
    targetType: row.targetType,
    assigneeId: row.assigneeId,
    role: row.role,
    status: row.status,
    assignedBy: row.assignedBy,
    assignedAt: serializeTimestamp(row.assignedAt)!,
    respondedAt: serializeTimestamp(row.respondedAt),
    completedAt: serializeTimestamp(row.completedAt),
    delegatedFromAssignmentId: row.delegatedFromAssignmentId,
  }
}

function serialize(task: TaskRow, organizationId: string): WorkTask {
  const hasContext =
    task.contextService !== null &&
    task.contextResource !== null &&
    task.contextId !== null
  return {
    object: 'task',
    id: task.id,
    uid: task.uid,
    organizationId,
    listId: task.listId,
    parentTaskId: task.parentTaskId,
    context: hasContext
      ? { service: task.contextService!, resource: task.contextResource!, id: task.contextId! }
      : null,
    links: task.links.map(serializeLink),
    title: task.title,
    description: task.description,
    status: task.status,
    importance: task.importance,
    priorityId: task.priorityId,
    assigneeId: task.assigneeId,
    assignments: task.assignments.map(serializeAssignment),
    startAt: serializeTimestamp(task.startAt),
    startTimeZone: task.startTimeZone,
    dueAt: serializeTimestamp(task.dueAt),
    dueTimeZone: task.dueTimeZone,
    estimatedDuration: task.estimatedDuration,
    percentComplete: task.percentComplete,
    recurrenceRuleId: task.recurrenceRuleId,
    completedAt: serializeTimestamp(task.completedAt),
    completedBy: task.completedBy,
    isOverdue:
      task.dueAt !== null &&
      task.status !== 'DONE' &&
      task.status !== 'CANCELLED' &&
      task.dueAt.getTime() < Date.now(),
    sortOrder: task.sortOrder,
    createdBy: task.createdBy,
    createdAt: serializeTimestamp(task.createdAt)!,
    updatedAt: serializeTimestamp(task.updatedAt)!,
  }
}

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('work/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('work/tenant-inactive')
  return tenant
}

function contextColumns(context?: WorkContext | null) {
  if (!context) return { contextService: null, contextResource: null, contextId: null }
  return { contextService: context.service, contextResource: context.resource, contextId: context.id }
}

export async function list(organizationId: string, filter: ListTaskFilter = {}) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const limit = filter.limit ?? 25
  const rows = await repository.list(tenant.id, {
    ...(filter.context
      ? { contextService: filter.context.service, contextResource: filter.context.resource, contextId: filter.context.id }
      : {}),
    ...(filter.listId ? { listId: filter.listId } : {}),
    ...(filter.parentTaskId !== undefined ? { parentTaskId: filter.parentTaskId } : {}),
    ...(filter.priorityId ? { priorityId: filter.priorityId } : {}),
    ...(filter.assigneeId ? { assigneeId: filter.assigneeId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    limit,
    ...(filter.startingAfter ? { startingAfter: filter.startingAfter } : {}),
    ...(filter.endingBefore ? { endingBefore: filter.endingBefore } : {}),
  })
  const page = rows.slice(0, limit)
  return {
    data: (filter.endingBefore ? page.reverse() : page).map((row) => serialize(row, organizationId)),
    hasMore: rows.length > limit,
  }
}

export async function retrieve(organizationId: string, taskId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.retrieve(tenant.id, taskId)
  return row ? serialize(row, organizationId) : null
}

export async function create(organizationId: string, input: CreateWorkTaskInput) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant

  const selectedList = input.listId
    ? await taskLists.retrieve(organizationId, input.listId)
    : await taskLists.ensureDefault(organizationId, input.createdBy)
  if (!selectedList || isError(selectedList))
    return selectedList ?? getError('work/task-list-not-found')

  if (input.parentTaskId) {
    const parent = await repository.retrieve(tenant.id, input.parentTaskId)
    if (!parent) return getError('work/task-not-found')
  }

  const row = await repository.create({
    tenantId: tenant.id,
    listId: selectedList.id,
    parentTaskId: input.parentTaskId ?? null,
    ...contextColumns(input.context),
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'OPEN',
    importance: input.importance ?? 'NORMAL',
    priorityId: input.priorityId ?? null,
    assigneeId: input.assigneeId ?? null,
    startAt: input.startAt == null ? null : fromUnixSeconds(input.startAt),
    startTimeZone: input.startTimeZone ?? null,
    dueAt: input.dueAt == null ? null : fromUnixSeconds(input.dueAt),
    dueTimeZone: input.dueTimeZone ?? null,
    estimatedDuration: input.estimatedDuration ?? null,
    percentComplete: input.percentComplete ?? (input.status === 'DONE' ? 100 : 0),
    recurrenceRuleId: input.recurrenceRuleId ?? null,
    completedAt: input.status === 'DONE' ? new Date() : null,
    completedBy: null,
    sortOrder: input.sortOrder ?? 0,
    createdBy: input.createdBy,
  })
  if (input.context !== undefined)
    await repository.syncPrimaryLink(row.id, input.context ?? null)
  if (input.assigneeId !== undefined)
    await repository.syncPrimaryAssignee(row.id, input.assigneeId ?? null, input.createdBy)

  return serialize((await repository.retrieve(tenant.id, row.id))!, organizationId)
}

export async function update(
  organizationId: string,
  taskId: string,
  input: UpdateWorkTaskInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, taskId)
  if (!current) return null

  if (input.listId) {
    const list = await taskLists.retrieve(organizationId, input.listId)
    if (!list || isError(list)) return list ?? getError('work/task-list-not-found')
  }
  if (input.parentTaskId) {
    if (input.parentTaskId === taskId) return getError('work/invalid-request')
    const parent = await repository.retrieve(tenant.id, input.parentTaskId)
    if (!parent) return getError('work/task-not-found')
  }

  const nextStatus = input.status ?? current.status
  const completionStamp =
    nextStatus === 'DONE' && !current.completedAt
      ? { completedAt: new Date(), completedBy: input.completedBy ?? null }
      : nextStatus !== 'DONE' && current.completedAt
        ? { completedAt: null, completedBy: null }
        : input.completedBy !== undefined
          ? { completedBy: input.completedBy }
          : {}

  await repository.update(taskId, {
    ...(input.context === undefined ? {} : contextColumns(input.context)),
    ...(input.listId === undefined ? {} : { listId: input.listId }),
    ...(input.parentTaskId === undefined ? {} : { parentTaskId: input.parentTaskId }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.importance === undefined ? {} : { importance: input.importance }),
    ...(input.priorityId === undefined ? {} : { priorityId: input.priorityId }),
    ...(input.assigneeId === undefined ? {} : { assigneeId: input.assigneeId }),
    ...(input.startAt === undefined ? {} : { startAt: input.startAt == null ? null : fromUnixSeconds(input.startAt) }),
    ...(input.startTimeZone === undefined ? {} : { startTimeZone: input.startTimeZone }),
    ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt == null ? null : fromUnixSeconds(input.dueAt) }),
    ...(input.dueTimeZone === undefined ? {} : { dueTimeZone: input.dueTimeZone }),
    ...(input.estimatedDuration === undefined ? {} : { estimatedDuration: input.estimatedDuration }),
    ...(input.percentComplete === undefined
      ? input.status === 'DONE'
        ? { percentComplete: 100 }
        : {}
      : { percentComplete: input.percentComplete }),
    ...(input.recurrenceRuleId === undefined ? {} : { recurrenceRuleId: input.recurrenceRuleId }),
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    ...completionStamp,
  })

  if (input.context !== undefined)
    await repository.syncPrimaryLink(taskId, input.context ?? null)
  if (input.assigneeId !== undefined)
    await repository.syncPrimaryAssignee(taskId, input.assigneeId ?? null, input.completedBy ?? current.createdBy)

  return serialize((await repository.retrieve(tenant.id, taskId))!, organizationId)
}

export async function remove(organizationId: string, taskId: string, deletedBy: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, taskId)
  if (!current) return null
  return repository.remove(taskId, deletedBy)
}
