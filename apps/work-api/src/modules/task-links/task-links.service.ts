import { isError } from '@876/core'
import type { CreateWorkTaskLinkInput, WorkTaskLink } from '@876/work'

import * as tasks from '../tasks/index.js'
import * as repository from './task-links.repository.js'

type Row = Awaited<ReturnType<typeof repository.list>>[number]

function stamp(value: Date) {
  return Math.floor(value.getTime() / 1000)
}

function serialize(row: Row): WorkTaskLink {
  return {
    object: 'task_link',
    id: row.id,
    taskId: row.taskId,
    service: row.service,
    resource: row.resource,
    externalId: row.externalId,
    label: row.label,
    url: row.url,
    isPrimary: row.isPrimary,
    createdAt: stamp(row.createdAt),
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
  return {
    data: (await repository.list(taskId)).map(serialize),
    hasMore: false,
  }
}

export async function create(
  organizationId: string,
  taskId: string,
  input: CreateWorkTaskLinkInput
) {
  const task = await requireTask(organizationId, taskId)
  if (!task || isError(task)) return task
  const existing = await repository.list(taskId)
  const row = await repository.create({
    taskId,
    service: input.service,
    resource: input.resource,
    externalId: input.externalId,
    label: input.label ?? null,
    url: input.url ?? null,
    isPrimary: input.isPrimary ?? existing.length === 0,
  })
  return serialize(row)
}

export async function remove(
  organizationId: string,
  taskId: string,
  linkId: string
) {
  const task = await requireTask(organizationId, taskId)
  if (!task || isError(task)) return task
  return repository.remove(taskId, linkId)
}
