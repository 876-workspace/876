import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateTaskParams = Omit<Prisma.WorkTaskUncheckedCreateInput, 'id'>
type UpdateTaskParams = Prisma.WorkTaskUncheckedUpdateInput

type TaskFilter = {
  contextService?: string
  contextResource?: string
  contextId?: string
  priorityId?: string
}

export const list = (tenantId: string, filter: TaskFilter = {}) =>
  prisma.workTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.contextService ? { contextService: filter.contextService } : {}),
      ...(filter.contextResource ? { contextResource: filter.contextResource } : {}),
      ...(filter.contextId ? { contextId: filter.contextId } : {}),
      ...(filter.priorityId ? { priorityId: filter.priorityId } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

export const retrieve = (tenantId: string, taskId: string) =>
  prisma.workTask.findFirst({
    where: { tenantId, id: taskId, deletedAt: null },
  })

export const create = (params: CreateTaskParams) =>
  prisma.workTask.create({
    data: { id: `task_${randomUUID().replaceAll('-', '')}`, ...params },
  })

export const update = (taskId: string, params: UpdateTaskParams) =>
  prisma.workTask.update({ where: { id: taskId }, data: params })

export async function remove(taskId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.workTask.delete({ where: { id: taskId } })
  else
    await prisma.workTask.update({
      where: { id: taskId },
      data: { deletedAt: new Date(), deletedBy },
    })

  return { object: 'task' as const, id: taskId, deleted: true as const }
}
