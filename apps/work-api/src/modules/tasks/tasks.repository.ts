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
  limit: number
  startingAfter?: string
  endingBefore?: string
}

export async function list(tenantId: string, filter: TaskFilter) {
  const cursorId = filter.startingAfter ?? filter.endingBefore
  const anchor = cursorId ? await retrieve(tenantId, cursorId) : null
  if (cursorId && !anchor) return []

  return prisma.workTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.contextService
        ? { contextService: filter.contextService }
        : {}),
      ...(filter.contextResource
        ? { contextResource: filter.contextResource }
        : {}),
      ...(filter.contextId ? { contextId: filter.contextId } : {}),
      ...(filter.priorityId ? { priorityId: filter.priorityId } : {}),
      ...(anchor
        ? filter.startingAfter
          ? tasksAfter(anchor)
          : tasksBefore(anchor)
        : {}),
    },
    orderBy: filter.endingBefore
      ? [{ sortOrder: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    take: filter.limit + 1,
  })
}

export const retrieve = (tenantId: string, taskId: string) =>
  prisma.workTask.findFirst({
    where: { tenantId, id: taskId, deletedAt: null },
  })

function tasksAfter(anchor: {
  sortOrder: number
  createdAt: Date
  id: string
}) {
  return {
    OR: [
      { sortOrder: { gt: anchor.sortOrder } },
      { sortOrder: anchor.sortOrder, createdAt: { gt: anchor.createdAt } },
      {
        sortOrder: anchor.sortOrder,
        createdAt: anchor.createdAt,
        id: { gt: anchor.id },
      },
    ],
  }
}

function tasksBefore(anchor: {
  sortOrder: number
  createdAt: Date
  id: string
}) {
  return {
    OR: [
      { sortOrder: { lt: anchor.sortOrder } },
      { sortOrder: anchor.sortOrder, createdAt: { lt: anchor.createdAt } },
      {
        sortOrder: anchor.sortOrder,
        createdAt: anchor.createdAt,
        id: { lt: anchor.id },
      },
    ],
  }
}

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
