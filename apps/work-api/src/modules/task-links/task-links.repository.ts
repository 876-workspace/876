import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.WorkTaskLinkUncheckedCreateInput, 'id'>

export const list = (taskId: string) =>
  prisma.workTaskLink.findMany({
    where: { taskId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })

export const retrieve = (taskId: string, linkId: string) =>
  prisma.workTaskLink.findFirst({ where: { taskId, id: linkId } })

export async function create(params: CreateParams) {
  return prisma.$transaction(async (tx) => {
    if (params.isPrimary)
      await tx.workTaskLink.updateMany({
        where: { taskId: params.taskId, isPrimary: true },
        data: { isPrimary: false },
      })

    return tx.workTaskLink.create({
      data: { id: `tasklink_${randomUUID().replaceAll('-', '')}`, ...params },
    })
  })
}

export async function remove(taskId: string, linkId: string) {
  const current = await retrieve(taskId, linkId)
  if (!current) return null
  await prisma.$transaction(async (tx) => {
    await tx.workTaskLink.delete({ where: { id: linkId } })
    if (current.isPrimary) {
      const next = await tx.workTaskLink.findFirst({
        where: { taskId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
      if (next)
        await tx.workTaskLink.update({
          where: { id: next.id },
          data: { isPrimary: true },
        })
    }
  })
  return { object: 'task_link' as const, id: linkId, deleted: true as const }
}
