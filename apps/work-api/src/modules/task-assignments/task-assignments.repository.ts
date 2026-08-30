import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.WorkTaskAssignmentUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.WorkTaskAssignmentUncheckedUpdateInput

export const list = (taskId: string) =>
  prisma.workTaskAssignment.findMany({
    where: { taskId },
    orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
  })

export const retrieve = (taskId: string, assignmentId: string) =>
  prisma.workTaskAssignment.findFirst({ where: { taskId, id: assignmentId } })

export const create = (params: CreateParams) =>
  prisma.workTaskAssignment.create({
    data: { id: `assign_${randomUUID().replaceAll('-', '')}`, ...params },
  })

export const update = (assignmentId: string, params: UpdateParams) =>
  prisma.workTaskAssignment.update({ where: { id: assignmentId }, data: params })

export async function remove(taskId: string, assignmentId: string) {
  const current = await retrieve(taskId, assignmentId)
  if (!current) return null
  await prisma.$transaction(async (tx) => {
    await tx.workTaskAssignment.delete({ where: { id: assignmentId } })
    if (
      current.targetType === 'USER' &&
      current.role === 'OWNER'
    ) {
      const next = await tx.workTaskAssignment.findFirst({
        where: { taskId, targetType: 'USER', role: 'OWNER' },
        orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
      })
      await tx.workTask.update({
        where: { id: taskId },
        data: { assigneeId: next?.assigneeId ?? null },
      })
    }
  })
  return {
    object: 'task_assignment' as const,
    id: assignmentId,
    deleted: true as const,
  }
}
