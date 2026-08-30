import { getError, isError } from '@876/core'
import type { WorkTask, WorkTaskStatus } from '@876/work'
import type {
  CreateTaskInput,
  RequestTask,
  TaskStatus,
  UpdateTaskInput,
} from '../../types/task.js'
import {
  crmRequestWorkContext,
  workClient,
  workErrorToCrm,
} from '../../providers/work.js'
import * as priorities from '../priorities/index.js'
import { requireRequestContext } from '../requests/index.js'

const workStatusToTaskStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING: 'IN_PROGRESS',
  DEFERRED: 'OPEN',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
  FAILED: 'CANCELLED',
} satisfies Record<WorkTaskStatus, TaskStatus>

function serialize(
  task: WorkTask,
  tenantId: string,
  requestId: string,
  priority: Awaited<ReturnType<typeof priorities.retrieveForTenant>> & {}
): RequestTask {
  return {
    object: 'request_task',
    id: task.id,
    tenantId,
    requestId,
    title: task.title,
    description: task.description,
    status: workStatusToTaskStatus[task.status],
    priorityId: priority.id,
    priority,
    assigneeId: task.assigneeId,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    completedBy: task.completedBy,
    sortOrder: task.sortOrder,
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

async function resolveSerializedTask(
  task: WorkTask,
  tenantId: string,
  requestId: string
) {
  if (!task.priorityId) return getError('crm/priority-not-found')
  const priority = await priorities.retrieveForTenant(tenantId, task.priorityId)
  if (!priority) return getError('crm/priority-not-found')
  return serialize(task, tenantId, requestId, priority)
}

async function listWork(organizationId: string, requestId: string) {
  const tasks: WorkTask[] = []
  let startingAfter: string | undefined

  for (let page = 0; page < 20; page += 1) {
    const result = await workClient().tasks.list(organizationId, {
      context: crmRequestWorkContext(requestId),
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (result.error) return workErrorToCrm(result.error)

    tasks.push(...result.data.data)
    if (!result.data.has_more) return tasks
    const lastTask = result.data.data.at(-1)
    if (!lastTask) return getError('crm/work-invalid-response')
    startingAfter = lastTask.id
  }

  return getError('crm/work-invalid-response')
}

async function findWorkTask(
  organizationId: string,
  requestId: string,
  taskId: string
) {
  const result = await workClient().tasks.retrieve(organizationId, taskId)
  if (result.error?.code === 'work/task-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  const context = crmRequestWorkContext(requestId)
  return result.data.context?.service === context.service &&
    result.data.context?.resource === context.resource &&
    result.data.context?.id === context.id
    ? result.data
    : null
}

export async function list(organizationId: string, requestId: string) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const result = await listWork(organizationId, requestId)
  if (isError(result)) return result

  const tasks: RequestTask[] = []
  for (const task of result) {
    const serialized = await resolveSerializedTask(
      task,
      context.tenantId,
      requestId
    )
    if (isError(serialized)) return serialized
    tasks.push(serialized)
  }
  return tasks
}

export async function create(
  organizationId: string,
  requestId: string,
  input: CreateTaskInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const priority = input.priorityId
    ? await priorities.requireActiveForTenant(
        context.tenantId,
        input.priorityId
      )
    : await priorities.retrieveDefaultForTenant(context.tenantId)
  if (!priority) return getError('crm/priority-not-found')
  if (isError(priority)) return priority

  const result = await workClient().tasks.create(organizationId, {
    context: crmRequestWorkContext(requestId),
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    priorityId: priority.id,
    assigneeId: input.assigneeId,
    dueAt: input.dueAt,
    sortOrder: input.sortOrder,
    createdBy: input.createdBy,
  })
  if (result.error) return workErrorToCrm(result.error)
  return serialize(
    result.data,
    context.tenantId,
    requestId,
    priorities.serialize(priority)
  )
}

export async function update(
  organizationId: string,
  requestId: string,
  taskId: string,
  input: UpdateTaskInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const current = await findWorkTask(organizationId, requestId, taskId)
  if (isError(current)) return current
  if (!current) return null

  let priority = current.priorityId
    ? await priorities.retrieveForTenant(context.tenantId, current.priorityId)
    : null
  if (input.priorityId) {
    const active = await priorities.requireActiveForTenant(
      context.tenantId,
      input.priorityId
    )
    if (isError(active)) return active
    priority = priorities.serialize(active)
  }
  if (!priority) return getError('crm/priority-not-found')

  const result = await workClient().tasks.update(organizationId, taskId, {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.priorityId === undefined ? {} : { priorityId: input.priorityId }),
    ...(input.assigneeId === undefined ? {} : { assigneeId: input.assigneeId }),
    ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt }),
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    ...(input.completedBy === undefined
      ? {}
      : { completedBy: input.completedBy }),
  })
  if (result.error?.code === 'work/task-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  return serialize(result.data, context.tenantId, requestId, priority)
}

export async function remove(
  organizationId: string,
  requestId: string,
  taskId: string,
  deletedBy: string
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const current = await findWorkTask(organizationId, requestId, taskId)
  if (isError(current)) return current
  if (!current) return null

  const result = await workClient().tasks.delete(
    organizationId,
    taskId,
    deletedBy
  )
  if (result.error?.code === 'work/task-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  return { object: 'request_task' as const, id: taskId, deleted: true as const }
}
