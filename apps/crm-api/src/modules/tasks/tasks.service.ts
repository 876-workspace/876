import { getError, isError } from '@876/core'
import type {
  CreateTaskInput,
  RequestTask,
  UpdateTaskInput,
} from '../../types/task.js'
import * as priorities from '../priorities/index.js'
import { requireRequestContext } from '../requests/index.js'
import * as repository from './tasks.repository.js'

type TaskRow = Awaited<ReturnType<typeof repository.list>>[number]

function fromUnixSeconds(seconds: number) {
  return new Date(seconds * 1000)
}

function serializeTimestamp(date: Date | null) {
  return date ? Math.floor(date.getTime() / 1000) : null
}

function serialize(task: TaskRow): RequestTask {
  return {
    object: 'request_task',
    id: task.id,
    tenantId: task.tenantId,
    requestId: task.requestId,
    title: task.title,
    description: task.description,
    status: task.status,
    priorityId: task.priorityId,
    priority: priorities.serialize(task.priority),
    assigneeId: task.assigneeId,
    dueAt: serializeTimestamp(task.dueAt),
    completedAt: serializeTimestamp(task.completedAt),
    completedBy: task.completedBy,
    sortOrder: task.sortOrder,
    createdBy: task.createdBy,
    createdAt: serializeTimestamp(task.createdAt)!,
    updatedAt: serializeTimestamp(task.updatedAt)!,
  }
}

async function resolvePriority(tenantId: string, priorityId?: string) {
  if (priorityId) return priorities.requireActiveForTenant(tenantId, priorityId)

  const priority = await priorities.retrieveDefaultForTenant(tenantId)
  if (!priority) return getError('crm/priority-not-found')
  return priority
}

export async function list(organizationId: string, requestId: string) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const tasks = await repository.list(context.tenantId, requestId)
  return tasks.map(serialize)
}

export async function create(
  organizationId: string,
  requestId: string,
  input: CreateTaskInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const priority = await resolvePriority(context.tenantId, input.priorityId)
  if (isError(priority)) return priority

  const task = await repository.create({
    tenantId: context.tenantId,
    requestId,
    ...input,
    priorityId: priority.id,
    dueAt: input.dueAt ? fromUnixSeconds(input.dueAt) : null,
  })

  return serialize(task)
}

export async function update(
  organizationId: string,
  requestId: string,
  taskId: string,
  input: UpdateTaskInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const current = await repository.retrieve(context.tenantId, requestId, taskId)
  if (!current) return null

  if (input.priorityId) {
    const priority = await priorities.requireActiveForTenant(
      context.tenantId,
      input.priorityId
    )
    if (isError(priority)) return priority
  }

  const completionStamp =
    input.status === 'DONE' && !current.completedAt
      ? { completedAt: new Date(), completedBy: input.completedBy }
      : input.status && input.status !== 'DONE' && current.completedAt
        ? { completedAt: null, completedBy: null }
        : {}

  const task = await repository.update(taskId, {
    ...input,
    ...completionStamp,
    dueAt:
      input.dueAt === undefined
        ? undefined
        : input.dueAt
          ? fromUnixSeconds(input.dueAt)
          : null,
  })

  return serialize(task)
}

export async function remove(
  organizationId: string,
  requestId: string,
  taskId: string,
  deletedBy: string
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const task = await repository.retrieve(context.tenantId, requestId, taskId)
  if (!task) return null
  return repository.remove(taskId, deletedBy)
}
