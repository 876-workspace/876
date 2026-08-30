import { getError, isError } from '@876/core'
import type {
  CreateWorkTaskInput,
  UpdateWorkTaskInput,
  WorkContext,
  WorkTask,
} from '@876/work'

import * as tenants from '../tenants/index.js'
import * as repository from './tasks.repository.js'

type TaskRow = Awaited<ReturnType<typeof repository.list>>[number]

type ListTaskFilter = {
  context?: WorkContext
  priorityId?: string
}

function fromUnixSeconds(seconds: number) {
  return new Date(seconds * 1000)
}

function serializeTimestamp(date: Date | null) {
  return date ? Math.floor(date.getTime() / 1000) : null
}

function serialize(task: TaskRow, organizationId: string): WorkTask {
  const hasContext =
    task.contextService !== null &&
    task.contextResource !== null &&
    task.contextId !== null
  return {
    object: 'task',
    id: task.id,
    organizationId,
    context: hasContext
      ? {
          service: task.contextService!,
          resource: task.contextResource!,
          id: task.contextId!,
        }
      : null,
    title: task.title,
    description: task.description,
    status: task.status,
    priorityId: task.priorityId,
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

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('work/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('work/tenant-inactive')
  return tenant
}

function contextColumns(context?: WorkContext | null) {
  if (!context)
    return { contextService: null, contextResource: null, contextId: null }
  return {
    contextService: context.service,
    contextResource: context.resource,
    contextId: context.id,
  }
}

export async function list(
  organizationId: string,
  filter: ListTaskFilter = {}
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const rows = await repository.list(tenant.id, {
    ...(filter.context
      ? {
          contextService: filter.context.service,
          contextResource: filter.context.resource,
          contextId: filter.context.id,
        }
      : {}),
    ...(filter.priorityId ? { priorityId: filter.priorityId } : {}),
  })
  return rows.map((row) => serialize(row, organizationId))
}

export async function create(
  organizationId: string,
  input: CreateWorkTaskInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.create({
    tenantId: tenant.id,
    ...contextColumns(input.context),
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'OPEN',
    priorityId: input.priorityId ?? null,
    assigneeId: input.assigneeId ?? null,
    dueAt: input.dueAt ? fromUnixSeconds(input.dueAt) : null,
    completedAt: null,
    completedBy: null,
    sortOrder: input.sortOrder ?? 0,
    createdBy: input.createdBy,
  })
  return serialize(row, organizationId)
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

  const completionStamp =
    input.status === 'DONE' && !current.completedAt
      ? { completedAt: new Date(), completedBy: input.completedBy ?? null }
      : input.status && input.status !== 'DONE' && current.completedAt
        ? { completedAt: null, completedBy: null }
        : {}

  const row = await repository.update(taskId, {
    ...(input.context === undefined ? {} : contextColumns(input.context)),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.priorityId === undefined ? {} : { priorityId: input.priorityId }),
    ...(input.assigneeId === undefined ? {} : { assigneeId: input.assigneeId }),
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    ...(input.dueAt === undefined
      ? {}
      : { dueAt: input.dueAt ? fromUnixSeconds(input.dueAt) : null }),
    ...(input.completedBy === undefined
      ? {}
      : { completedBy: input.completedBy }),
    ...completionStamp,
  })
  return serialize(row, organizationId)
}

export async function remove(
  organizationId: string,
  taskId: string,
  deletedBy: string
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, taskId)
  if (!current) return null
  return repository.remove(taskId, deletedBy)
}
