import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.RequestReminderUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.RequestReminderUncheckedUpdateInput

export const list = (tenantId: string, requestId: string) =>
  prisma.requestReminder.findMany({
    where: { tenantId, requestId, deletedAt: null },
    orderBy: { remindAt: 'asc' },
  })

export const retrieve = (
  tenantId: string,
  requestId: string,
  reminderId: string
) =>
  prisma.requestReminder.findFirst({
    where: { tenantId, requestId, id: reminderId, deletedAt: null },
  })

export const create = (params: CreateParams) =>
  prisma.requestReminder.create({
    data: { id: `crm_rem_${randomUUID().replaceAll('-', '')}`, ...params },
  })

export const update = (reminderId: string, params: UpdateParams) =>
  prisma.requestReminder.update({ where: { id: reminderId }, data: params })

export async function remove(reminderId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.requestReminder.delete({ where: { id: reminderId } })
  else
    await prisma.requestReminder.update({
      where: { id: reminderId },
      data: { deletedAt: new Date(), deletedBy },
    })

  return {
    object: 'request_reminder' as const,
    id: reminderId,
    deleted: true as const,
  }
}
