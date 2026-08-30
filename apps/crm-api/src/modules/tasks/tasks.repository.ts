import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateTaskParams = Omit<Prisma.RequestTaskUncheckedCreateInput, 'id'>
type UpdateTaskParams = Prisma.RequestTaskUncheckedUpdateInput

export const list = (tenantId: string, requestId: string) =>
  prisma.requestTask.findMany({
    where: { tenantId, requestId, deletedAt: null },
    include: { priority: true },
    orderBy: { sortOrder: 'asc' },
  })

export const retrieve = (tenantId: string, requestId: string, taskId: string) =>
  prisma.requestTask.findFirst({
    where: { tenantId, requestId, id: taskId, deletedAt: null },
    include: { priority: true },
  })

export const create = (params: CreateTaskParams) =>
  prisma.requestTask.create({
    data: { id: `task_${randomUUID().replaceAll('-', '')}`, ...params },
    include: { priority: true },
  })

export const update = (taskId: string, params: UpdateTaskParams) =>
  prisma.requestTask.update({
    where: { id: taskId },
    data: params,
    include: { priority: true },
  })

export async function remove(taskId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.requestTask.delete({ where: { id: taskId } })
  else
    await prisma.requestTask.update({
      where: { id: taskId },
      data: { deletedAt: new Date(), deletedBy },
    })

  return {
    object: 'request_task' as const,
    id: taskId,
    deleted: true as const,
  }
}
