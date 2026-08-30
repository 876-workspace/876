import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateReminderParams = Omit<
  Prisma.WorkReminderUncheckedCreateInput,
  'id'
>
type UpdateReminderParams = Prisma.WorkReminderUncheckedUpdateInput

type ReminderFilter = {
  contextService?: string
  contextResource?: string
  contextId?: string
  userId?: string
}

export const list = (tenantId: string, filter: ReminderFilter = {}) =>
  prisma.workReminder.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.contextService ? { contextService: filter.contextService } : {}),
      ...(filter.contextResource ? { contextResource: filter.contextResource } : {}),
      ...(filter.contextId ? { contextId: filter.contextId } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
    },
    orderBy: [{ remindAt: 'asc' }, { createdAt: 'asc' }],
  })

export const retrieve = (tenantId: string, reminderId: string) =>
  prisma.workReminder.findFirst({
    where: { tenantId, id: reminderId, deletedAt: null },
  })

export const create = (params: CreateReminderParams) =>
  prisma.workReminder.create({
    data: { id: `reminder_${randomUUID().replaceAll('-', '')}`, ...params },
  })

export const update = (reminderId: string, params: UpdateReminderParams) =>
  prisma.workReminder.update({ where: { id: reminderId }, data: params })

export async function remove(reminderId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.workReminder.delete({ where: { id: reminderId } })
  else
    await prisma.workReminder.update({
      where: { id: reminderId },
      data: { deletedAt: new Date(), deletedBy },
    })

  return { object: 'reminder' as const, id: reminderId, deleted: true as const }
}
