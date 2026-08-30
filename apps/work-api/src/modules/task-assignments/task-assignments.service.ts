import { isError } from '@876/core'
import type {
  CreateWorkTaskAssignmentInput,
  UpdateWorkTaskAssignmentInput,
  WorkTaskAssignment,
} from '@876/work'

import * as tasks from '../tasks/index.js'
import * as repository from './task-assignments.repository.js'

type Row = Awaited<ReturnType<typeof repository.list>>[number]

function stamp(value: Date | null) {
  return value ? Math.floor(value.getTime() / 1000) : null
}
function serialize(row: Row): WorkTaskAssignment {
  return {
    object: 'task_assignment',
    id: row.id,
    taskId: row.taskId,
    targetType: row.targetType,
    assigneeId: row.assigneeId,
    role: row.role,
    status: row.status,
    assignedBy: row.assignedBy,
    assignedAt: stamp(row.assignedAt)!,
    respondedAt: stamp(row.respondedAt),
    completedAt: stamp(row.completedAt),
    delegatedFromAssignmentId: row.delegatedFromAssignmentId,
  }
}

async function requireTask(organizationId: string, taskId: string) {
  const task = await tasks.retrieve(organizationId, taskId)
  if (isError(task)) return task
  return task
}

export async function list(organizationId: string, taskId: string) {
  const task = await requireTask(organizationId, taskId)
  if (!task || isError(task)) return task
  return { data: (await repository.list(taskId)).map(serialize), hasMore: false }
}

export async function create(
  organizationId: string,
  taskId: string,
  input: CreateWorkTaskAssignmentInput
) {
  const task = await requireTask(organizationId, taskId)
  if (!task || isError(task)) return task
  if (input.delegatedFromAssignmentId) {
    const source = await repository.retrieve(taskId, input.delegatedFromAssignmentId)
    if (!source) return null
  }
  const row = await repository.create({
    taskId,
    targetType: input.targetType,
    assigneeId: input.assigneeId,
    role: input.role ?? 'OWNER',
    status: input.status ?? 'PENDING',
    assignedBy: input.assignedBy,
    delegatedFromAssignmentId: input.delegatedFromAssignmentId ?? null,
    respondedAt:
      input.status && input.status !== 'PENDING' ? new Date() : null,
    completedAt: input.status === 'COMPLETED' ? new Date() : null,
  })
  if (row.targetType === 'USER' && row.role === 'OWNER' && !task.assigneeId)
    await tasks.update(organizationId, taskId, {
      assigneeId: row.assigneeId,
    })
  return serialize(row)
}

export async function update(
  organizationId: string,
  taskId: string,
  assignmentId: string,
  input: UpdateWorkTaskAssignmentInput
) {
  const task = await requireTask(organizationId, taskId)
  if (!task || isError(task)) return task
  const current = await repository.retrieve(taskId, assignmentId)
  if (!current) return null

  const nextStatus = input.status ?? current.status
  const row = await repository.update(assignmentId, {
    ...(input.role === undefined ? {} : { role: input.role }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.status === undefined
      ? {}
      : { respondedAt: input.status === 'PENDING' ? null : new Date() }),
    completedAt: nextStatus === 'COMPLETED' ? current.completedAt ?? new Date() : null,
  })
  return serialize(row)
}

export async function remove(
  organizationId: string,
  taskId: string,
  assignmentId: string
) {
  const task = await requireTask(organizationId, taskId)
  if (!task || isError(task)) return task
  return repository.remove(taskId, assignmentId)
}
